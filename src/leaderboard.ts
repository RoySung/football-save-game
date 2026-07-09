import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { GAME_CONSTANTS } from "./constants";

export interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  timestamp: any;
}

const COLLECTION_NAME = GAME_CONSTANTS.LEADERBOARD_COLLECTION;
const SALT = GAME_CONSTANTS.LEADERBOARD_SALT;

// Generate a simple verification checksum
function generateChecksum(name: string, score: number, timeStr: string): string {
  // Simple obfuscation: name + score + salt + timestamp encoded in base64
  const raw = `${name}:${score}:${SALT}:${timeStr}`;
  // Use modern safe Base64 encoder that handles unicode characters safely
  return btoa(encodeURIComponent(raw));
}

/**
 * Fetch top 10 scores from Firestore
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured. Please fill in your .env or .env.local file.");
  }
  
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("score", "desc"),
      limit(GAME_CONSTANTS.LEADERBOARD_LIMIT)
    );
    const querySnapshot = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        name: data.name,
        score: data.score,
        timestamp: data.timestamp,
      });
    });

    // Client-side sort: score desc, then timestamp asc
    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return aTime - bTime;
    });

    return entries;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }
}

/**
 * Check if a score qualifies for the leaderboard (is in top 10)
 */
export async function qualifiesForLeaderboard(score: number): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const entries = await fetchLeaderboard();
    if (entries.length < GAME_CONSTANTS.LEADERBOARD_LIMIT) {
      return true;
    }
    const lowestScore = entries[entries.length - 1].score;
    return score > lowestScore;
  } catch (error) {
    console.error("Error checking qualification:", error);
    // If query fails, default to false so we don't prompt name input for a failed db
    return false;
  }
}

/**
 * Submit score to Firestore
 */
export async function submitScore(name: string, score: number): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured. Cannot submit score.");
  }

  // Clean name
  const cleanName = name.trim().substring(0, GAME_CONSTANTS.LEADERBOARD_MAX_NAME_LENGTH) || "Player";
  
  // Basic range check
  if (score < 0 || score > GAME_CONSTANTS.LEADERBOARD_MAX_SCORE) {
    throw new Error("Invalid score");
  }

  try {
    const now = new Date();
    const timestampStr = now.toISOString();
    const checksum = generateChecksum(cleanName, score, timestampStr);

    await addDoc(collection(db, COLLECTION_NAME), {
      name: cleanName,
      score: score,
      timestamp: serverTimestamp(),
      checksum: checksum,
    });
  } catch (error) {
    console.error("Error submitting score:", error);
    throw error;
  }
}
