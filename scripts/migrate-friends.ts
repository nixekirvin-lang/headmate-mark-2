/**
 * Migration script to sync user friend counts with accepted friendships
 * 
 * This script:
 * 1. Queries all users from the users collection
 * 2. For each user, finds all accepted friendships
 * 3. Updates the user's friendIds array and friendsCount
 * 
 * Run with: npx tsx scripts/migrate-friends.ts
 * 
 * Requires either:
 * - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
 * - Or run 'gcloud auth application-default login' first
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Try to initialize Firebase Admin
async function initializeFirebase() {
  // Check for service account file
  const serviceAccountPath = path.join(process.cwd(), 'headmate-mark-2-firebase-adminsdk.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    console.log('Found service account file, using it...');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    return;
  }
  
  // Try Application Default Credentials
  try {
    console.log('Trying Application Default Credentials...');
    initializeApp({
      credential: applicationDefault()
    });
    return;
  } catch (e) {
    console.log('No Application Default Credentials found');
  }
  
  // Try to find credentials in other common locations
  const possiblePaths = [
    path.join(process.env.HOME || '', '.config', 'gcloud', 'application_default_credentials.json'),
    path.join(process.env.APPDATA || '', 'gcloud', 'application_default_credentials.json'),
  ];
  
  for (const credPath of possiblePaths) {
    if (fs.existsSync(credPath)) {
      console.log(`Found credentials at ${credPath}`);
      try {
        initializeApp({
          credential: cert(JSON.parse(fs.readFileSync(credPath, 'utf-8')))
        });
        return;
      } catch (e) {
        console.log(`Failed to use credentials from ${credPath}`);
      }
    }
  }
  
  throw new Error('No Firebase credentials found. Please either:\n' +
    '1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file\n' +
    '2. Run "gcloud auth application-default login"\n' +
    '3. Download service account from Firebase Console and save as headmate-mark-2-firebase-adminsdk.json');
}

interface UserData {
  uid: string;
  displayName?: string;
  systemName?: string;
  friendIds?: string[];
  friendsCount?: number;
}

interface FriendshipData {
  user1Id: string;
  user2Id: string;
  status: string;
}

async function migrateFriends() {
  console.log('Initializing Firebase Admin...');
  await initializeFirebase();
  
  const db = getFirestore();
  
  console.log('Fetching all users...');
  
  // Get all users
  const usersSnapshot = await db.collection('users').get();
  const users: UserData[] = usersSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: data.displayName,
      systemName: data.systemName,
      friendIds: data.friendIds || [],
      friendsCount: data.friendsCount || 0
    };
  });
  
  console.log(`Found ${users.length} users`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const user of users) {
    console.log(`\nProcessing user: ${user.uid} (${user.displayName || user.systemName || 'Unknown'})`);
    
    // Get all accepted friendships where user is either user1Id or user2Id
    const friendshipsQuery1 = await db.collection('friendships')
      .where('user1Id', '==', user.uid)
      .where('status', '==', 'accepted')
      .get();
    
    const friendshipsQuery2 = await db.collection('friendships')
      .where('user2Id', '==', user.uid)
      .where('status', '==', 'accepted')
      .get();
    
    // Build friend IDs array
    const friendIds: string[] = [];
    
    // Add friends from where user is user1Id
    friendshipsQuery1.docs.forEach(doc => {
      const data = doc.data() as FriendshipData;
      if (data.user2Id && !friendIds.includes(data.user2Id)) {
        friendIds.push(data.user2Id);
      }
    });
    
    // Add friends from where user is user2Id
    friendshipsQuery2.docs.forEach(doc => {
      const data = doc.data() as FriendshipData;
      if (data.user1Id && !friendIds.includes(data.user1Id)) {
        friendIds.push(data.user1Id);
      }
    });
    
    console.log(`  Found ${friendIds.length} accepted friendships`);
    
    // Get current friendIds from user profile
    const currentFriendIds: string[] = user.friendIds || [];
    const currentFriendsCount: number = user.friendsCount || 0;
    
    // Check if update is needed
    const needsUpdate = 
      currentFriendIds.length !== friendIds.length ||
      !friendIds.every(id => currentFriendIds.includes(id));
    
    if (needsUpdate) {
      console.log(`  Current friendIds: ${currentFriendIds.length}, New friendIds: ${friendIds.length}`);
      console.log(`  Current friendsCount: ${currentFriendsCount}, New friendsCount: ${friendIds.length}`);
      
      // Update the user profile
      await db.collection('users').doc(user.uid).update({
        friendIds: friendIds,
        friendsCount: friendIds.length
      });
      
      console.log(`  ✓ Updated user ${user.uid}`);
      updatedCount++;
    } else {
      console.log(`  ✓ No update needed`);
      skippedCount++;
    }
  }
  
  console.log(`\n=== Migration Complete ===`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (already in sync): ${skippedCount}`);
  console.log(`Total users processed: ${users.length}`);
}

// Run the migration
migrateFriends().catch(console.error);
