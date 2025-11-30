"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { Person } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { Edit, Trash2, UserPlus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function KnownPersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "known_users"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const personsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Person[];

      setPersons(personsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this person?")) {
      try {
        await deleteDoc(doc(db, "known_users", id));
      } catch (error) {
        console.error("Error deleting person:", error);
        alert("Failed to delete person");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Known Persons</h1>
          <p className="text-slate-400 mt-1">Manage registered individuals</p>
        </div>
        <Link href="/dashboard/known-persons/add">
          <Button variant="primary">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Persons</p>
              <p className="text-3xl font-bold text-white mt-1">
                {persons.length}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Persons Grid */}
      {persons.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No registered persons
          </h3>
          <p className="text-slate-400 mb-6">
            Add family members or authorized persons to enable recognition
          </p>
          <Link href="/dashboard/known-persons/add">
            <Button variant="primary">
              <UserPlus className="h-4 w-4 mr-2" />
              Add First Person
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {persons.map((person) => (
            <Card key={person.id} className="overflow-hidden">
              <div className="relative h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                {person.trainingImages && person.trainingImages[0] ? (
                  <Image
                    src={person.trainingImages[0]}
                    alt={person.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Users className="h-16 w-16 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-1">
                  {person.name}
                </h3>
                <p className="text-sm text-slate-400 mb-4 capitalize">
                  {person.relation || "Family member"}
                </p>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <span>
                    Added{" "}
                    {formatDistanceToNow(
                      person.createdAt?.toDate() || new Date(),
                      { addSuffix: true }
                    )}
                  </span>
                  {person.detectionCount && (
                    <>
                      <span>•</span>
                      <span>{person.detectionCount} detections</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/known-persons/${person.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(person.id!)}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
