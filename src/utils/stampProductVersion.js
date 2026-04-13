// src/utils/stampProductVersion.js
import { db, auth } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";

export const stampProductVersion = async (ownerId) => {
  const uid = ownerId || auth.currentUser?.uid;
  if (!uid) return;

  await setDoc(
    doc(db, "productVersions", uid),
    {
      version: Date.now().toString(),
      updatedAt: new Date(),
    }
  );
};