import os
import io
from typing import List, Tuple

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import cv2
from concurrent.futures import ThreadPoolExecutor
import time

from deepface import DeepFace
from pymilvus import connections, utility, FieldSchema, CollectionSchema, DataType, Collection


MILVUS_HOST = os.environ.get("MILVUS_HOST", "127.0.0.1")
MILVUS_PORT = os.environ.get("MILVUS_PORT", "19530")
COLLECTION_NAME = os.environ.get("MILVUS_COLLECTION", "faces")
VECTOR_DIM = 2622  # DeepFace VGG-Face default embedding size
INDEX_TYPE = "IVF_FLAT"
METRIC_TYPE = "IP"  # cosine similarity proxy if embeddings are normalized
NLIST = 1024


app = Flask(__name__)
CORS(app)
executor = ThreadPoolExecutor(max_workers=1)


def connect_milvus() -> None:
    if not connections.has_connection("default"):
        connections.connect(alias="default", host=MILVUS_HOST, port=MILVUS_PORT)


def ensure_collection() -> Collection:
    connect_milvus()

    def create_new_collection() -> Collection:
        fields = [
            FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="name", dtype=DataType.VARCHAR, max_length=256),
            FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=VECTOR_DIM),
        ]
        schema = CollectionSchema(fields=fields, description="Face embeddings")
        col_new = Collection(name=COLLECTION_NAME, schema=schema)
        col_new.create_index(
            field_name="vector",
            index_params={"index_type": INDEX_TYPE, "metric_type": METRIC_TYPE, "params": {"nlist": NLIST}},
        )
        col_new.load()
        return col_new

    if not utility.has_collection(COLLECTION_NAME):
        return create_new_collection()

    # Validate existing schema; if mismatched, drop and recreate
    col = Collection(COLLECTION_NAME)
    try:
        existing_fields = {f.name: f for f in col.schema.fields}
        vector_field_ok = (
            "vector" in existing_fields and existing_fields["vector"].dtype == DataType.FLOAT_VECTOR
        )
        name_field_ok = (
            "name" in existing_fields and existing_fields["name"].dtype == DataType.VARCHAR
        )
        if not (vector_field_ok and name_field_ok):
            # Drop and recreate with expected schema
            col.release()
            utility.drop_collection(COLLECTION_NAME)
            return create_new_collection()
    except Exception:
        # On any inspection error, recreate collection
        try:
            utility.drop_collection(COLLECTION_NAME)
        except Exception:
            pass
        return create_new_collection()

    try:
        col.load()
    except Exception:
        pass
    return col


def read_images_from_form(prefix: str = "angle_") -> List[np.ndarray]:
    images: List[np.ndarray] = []
    for key in sorted(request.files.keys()):
        if not key.startswith(prefix):
            continue
        file = request.files[key]
        if not file:
            continue
        img = Image.open(io.BytesIO(file.read())).convert("RGB")
        images.append(np.array(img))
    return images


def get_face_embedding(image_rgb: np.ndarray) -> np.ndarray:
    # DeepFace expects BGR or RGB depending on backend; we use represent to get embeddings
    # Using model_name='VGG-Face' for consistent 2622-dim embeddings
    # DeepFace expects BGR numpy arrays; convert RGB -> BGR by reversing channels
    image_bgr = image_rgb[:, :, ::-1].copy()
    # Resize to speed up embedding
    try:
        image_bgr = cv2.resize(image_bgr, (224, 224), interpolation=cv2.INTER_AREA)
    except Exception:
        pass
    reps = DeepFace.represent(
        img_path=image_bgr,
        model_name="VGG-Face",
        detector_backend="opencv",
        enforce_detection=False,
        align=True,
    )
    # reps can be list if multiple detected; pick first
    if isinstance(reps, list) and len(reps) > 0:
        emb = np.array(reps[0]["embedding"], dtype=np.float32)
    elif isinstance(reps, dict) and "embedding" in reps:
        emb = np.array(reps["embedding"], dtype=np.float32)
    else:
        raise ValueError("No embedding produced")
    # normalize for cosine-like IP
    norm = np.linalg.norm(emb) + 1e-12
    return (emb / norm).astype(np.float32)


def aggregate_embeddings(embeddings: List[np.ndarray]) -> np.ndarray:
    if not embeddings:
        raise ValueError("No embeddings to aggregate")
    mean_vec = np.mean(np.stack(embeddings, axis=0), axis=0)
    norm = np.linalg.norm(mean_vec) + 1e-12
    return (mean_vec / norm).astype(np.float32)


@app.route("/health", methods=["GET"])
def health():
    try:
        ensure_collection()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/register-multi-angle", methods=["POST"])
def register_multi_angle():
    name = request.form.get("person_name") or request.form.get("name")
    if not name:
        return jsonify({"success": False, "message": "Missing person_name"}), 400

    images = read_images_from_form(prefix="angle_")
    if len(images) == 0:
        return jsonify({"success": False, "message": "No images provided"}), 400

    # If more than 10 are provided, cap to 10; if fewer, still proceed but recommend 10
    images = images[:10]

    try:
        # Compute embeddings
        embeddings: List[np.ndarray] = []
        for img_rgb in images:
            emb = get_face_embedding(img_rgb)
            embeddings.append(emb)
        person_vec = aggregate_embeddings(embeddings)

        col = ensure_collection()

        # Insert with simple retry
        last_err = None
        for attempt in range(3):
            try:
                # Insert columns for non-primary fields (auto_id pk omitted)
                col.insert([[name], [person_vec.tolist()]], fields=["name", "vector"])
                col.flush()
                try:
                    col.load()
                except Exception:
                    pass
                break
            except Exception as e:
                last_err = e
                time.sleep(0.3 * (attempt + 1))
        else:
            return jsonify({"success": False, "message": f"Insert failed: {last_err}"}), 500

        # Verify by querying back the name
        try:
            results = col.query(expr=f'name == "{name}"', output_fields=["name"], limit=1)
            if not results:
                return jsonify({"success": False, "message": "Verification failed: record not found"}), 500
        except Exception as e:
            return jsonify({"success": False, "message": f"Verification error: {e}"}), 500

        return jsonify({"success": True, "name": name, "num_images": len(images)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


def search_similar(embedding: np.ndarray, top_k: int = 5) -> Tuple[List[str], List[float]]:
    col = ensure_collection()
    search_params = {"metric_type": METRIC_TYPE, "params": {"nprobe": 32}}
    res = col.search(
        data=[embedding.tolist()],
        anns_field="vector",
        param=search_params,
        limit=top_k,
        output_fields=["name"],
    )
    hits = res[0]
    names = [hit.entity.get("name") for hit in hits]
    scores = [float(hit.distance) for hit in hits]
    return names, scores


@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"found": False, "message": "No image"}), 400
    file = request.files["image"]
    img = Image.open(io.BytesIO(file.read())).convert("RGB")
    arr = np.array(img)
    try:
        emb = get_face_embedding(arr)
        names, scores = search_similar(emb, top_k=1)
        if not names:
            return jsonify({"found": False})
        # For inner product on normalized vectors, higher is better (<=1)
        score = scores[0]
        name = names[0]
        confidence = max(0.0, min(100.0, score * 100.0))
        return jsonify({"found": True, "name": name, "confidence": confidence})
    except Exception as e:
        return jsonify({"found": False, "message": str(e)}), 500


# -----------------------------
# Admin endpoints (inspect/clear)
# -----------------------------

@app.route("/admin/faces", methods=["GET"])
def admin_list_faces():
    try:
        col = ensure_collection()
        limit = int(request.args.get("limit", 50))
        # Query names; avoid returning vectors by default
        results = col.query(expr="", output_fields=["name"], limit=limit)
        names = [r.get("name") for r in results]
        total = col.num_entities
        return jsonify({"total": int(total), "names": names})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/admin/faces/vector", methods=["GET"])
def admin_get_vector_by_name():
    name = request.args.get("name")
    if not name:
        return jsonify({"success": False, "message": "Missing name"}), 400
    try:
        col = ensure_collection()
        res = col.query(expr=f'name == "{name}"', output_fields=["name", "vector"], limit=1)
        if not res:
            return jsonify({"success": False, "message": "Not found"}), 404
        vec = res[0].get("vector")
        return jsonify({"success": True, "name": name, "dim": len(vec) if vec else 0, "vector": vec})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/admin/faces", methods=["DELETE"])
def admin_delete_by_name():
    name = request.args.get("name")
    if not name:
        return jsonify({"success": False, "message": "Missing name"}), 400
    try:
        col = ensure_collection()
        # Delete by expression
        col.delete(expr=f'name == "{name}"')
        col.flush()
        return jsonify({"success": True, "deleted": name})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/admin/faces/clear", methods=["POST"])
def admin_clear_all():
    try:
        connect_milvus()
        if utility.has_collection(COLLECTION_NAME):
            try:
                col = Collection(COLLECTION_NAME)
                col.release()
            except Exception:
                pass
            utility.drop_collection(COLLECTION_NAME)
        # Recreate clean collection
        ensure_collection()
        return jsonify({"success": True, "cleared": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)


