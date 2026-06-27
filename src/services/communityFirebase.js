import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../lib/firebase.js";

const moderatorEmail = "adhvikeze@gmail.com";

const asIso = (value) => value?.toDate?.().toISOString() || new Date().toISOString();
const asDate = (value) => value instanceof Date ? value : new Date(value);

export function observeCommunityAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function registerCommunityAccount(form) {
  const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
  const user = credential.user;
  const displayName = form.displayName.trim().slice(0, 50);
  const city = form.city.trim().slice(0, 50);
  await updateProfile(user, { displayName });

  const batch = writeBatch(db);
  batch.set(doc(db, "publicProfiles", user.uid), { displayName, city, createdAt: serverTimestamp() });
  batch.set(doc(db, "privateProfiles", user.uid), {
    ageGroup: form.ageGroup === "under18" ? "under18" : "adult",
    guardianConfirmed: form.ageGroup === "under18" ? Boolean(form.guardianConfirmed) : false,
    createdAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    await deleteUser(user).catch(() => undefined);
    throw error;
  }
  await sendEmailVerification(user).catch(() => undefined);
  return user;
}

export async function loginCommunityAccount(form) {
  return (await signInWithEmailAndPassword(auth, form.email.trim(), form.password)).user;
}

export function logoutCommunityAccount() {
  return signOut(auth);
}

function identity(user, profile) {
  return {
    authorUid: user.uid,
    authorName: profile.displayName,
    authorCity: profile.city,
  };
}

export function subscribeCommunity(user, onData, onError) {
  let profile = { displayName: user.displayName || "Community member", city: "UAE" };
  let profileReady = false;
  let posts = [];
  let challenges = [];
  let meetups = [];
  let reports = [];
  const comments = new Map();
  const reactions = new Map();
  const members = new Map();
  const attendees = new Map();
  const locations = new Map();
  const topUnsubs = [];
  const childUnsubs = new Map();
  let closed = false;

  const isModerator = user.email === moderatorEmail && user.emailVerified;
  const emit = () => {
    if (closed || !profileReady) return;
    onData({
      user: { id: user.uid, displayName: profile.displayName, city: profile.city, role: isModerator ? "moderator" : "member" },
      discussions: posts.map((post) => {
        const postReactions = reactions.get(post.id) || new Set();
        return { ...post, comments: comments.get(post.id) || [], reacted: postReactions.has(user.uid), reactionCount: postReactions.size };
      }),
      challenges: challenges.map((challenge) => {
        const challengeMembers = members.get(challenge.id) || new Set();
        return { ...challenge, joined: challengeMembers.has(user.uid), memberCount: challengeMembers.size };
      }),
      meetups: meetups.map((meetup) => {
        const meetupAttendees = attendees.get(meetup.id) || new Set();
        return { ...meetup, attending: meetupAttendees.has(user.uid), attendeeCount: meetupAttendees.size, exactLocation: locations.get(meetup.id) || null };
      }),
      moderation: isModerator ? { openReports: reports } : null,
    });
  };

  const ensureChild = (key, ref, handler, errorHandler = onError) => {
    if (childUnsubs.has(key)) return;
    childUnsubs.set(key, onSnapshot(ref, handler, errorHandler));
  };

  const trimChildren = (prefix, activeIds) => {
    for (const [key, unsubscribe] of childUnsubs) {
      if (key.startsWith(prefix) && !activeIds.has(key.slice(prefix.length))) {
        unsubscribe();
        childUnsubs.delete(key);
      }
    }
  };

  topUnsubs.push(onSnapshot(doc(db, "publicProfiles", user.uid), (snapshot) => {
    if (!snapshot.exists()) return;
    profile = snapshot.data();
    profileReady = true;
    emit();
  }, onError));

  topUnsubs.push(onSnapshot(
    query(collection(db, "posts"), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(50)),
    (snapshot) => {
      posts = snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: asIso(item.data().createdAt), author: { displayName: item.data().authorName, city: item.data().authorCity } }));
      const active = new Set(posts.map((post) => post.id));
      trimChildren("post-comments:", active);
      trimChildren("post-reactions:", active);
      for (const post of posts) {
        ensureChild(`post-comments:${post.id}`, query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"), limit(100)), (childSnapshot) => {
          comments.set(post.id, childSnapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: asIso(item.data().createdAt), author: { displayName: item.data().authorName, city: item.data().authorCity } })));
          emit();
        });
        ensureChild(`post-reactions:${post.id}`, collection(db, "posts", post.id, "reactions"), (childSnapshot) => {
          reactions.set(post.id, new Set(childSnapshot.docs.map((item) => item.id)));
          emit();
        });
      }
      emit();
    },
    onError,
  ));

  topUnsubs.push(onSnapshot(
    query(collection(db, "challenges"), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(30)),
    (snapshot) => {
      challenges = snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: asIso(item.data().createdAt), endsAt: asIso(item.data().endsAt) }));
      const active = new Set(challenges.map((challenge) => challenge.id));
      trimChildren("challenge-members:", active);
      for (const challenge of challenges) {
        ensureChild(`challenge-members:${challenge.id}`, collection(db, "challenges", challenge.id, "members"), (childSnapshot) => {
          members.set(challenge.id, new Set(childSnapshot.docs.map((item) => item.id)));
          emit();
        });
      }
      emit();
    },
    onError,
  ));

  topUnsubs.push(onSnapshot(
    query(collection(db, "meetups"), where("status", "==", "active"), orderBy("startsAt", "asc"), limit(30)),
    (snapshot) => {
      meetups = snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: asIso(item.data().createdAt), startsAt: asIso(item.data().startsAt), creator: { displayName: item.data().authorName, city: item.data().authorCity } }));
      const active = new Set(meetups.map((meetup) => meetup.id));
      trimChildren("meetup-attendees:", active);
      trimChildren("meetup-location:", active);
      for (const meetup of meetups) {
        ensureChild(`meetup-attendees:${meetup.id}`, collection(db, "meetups", meetup.id, "attendees"), (childSnapshot) => {
          const ids = new Set(childSnapshot.docs.map((item) => item.id));
          attendees.set(meetup.id, ids);
          const maySeeLocation = ids.has(user.uid) || meetup.creatorUid === user.uid || isModerator;
          if (maySeeLocation) {
            ensureChild(`meetup-location:${meetup.id}`, doc(db, "meetups", meetup.id, "private", "location"), (locationSnapshot) => {
              if (locationSnapshot.exists()) locations.set(meetup.id, locationSnapshot.data().exactLocation);
              emit();
            });
          } else {
            const key = `meetup-location:${meetup.id}`;
            childUnsubs.get(key)?.();
            childUnsubs.delete(key);
            locations.delete(meetup.id);
          }
          emit();
        });
      }
      emit();
    },
    onError,
  ));

  if (isModerator) {
    topUnsubs.push(onSnapshot(query(collection(db, "reports"), where("status", "==", "open"), limit(50)), (snapshot) => {
      reports = snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: asIso(item.data().createdAt) }));
      emit();
    }, onError));
  }

  return () => {
    closed = true;
    topUnsubs.forEach((unsubscribe) => unsubscribe());
    childUnsubs.forEach((unsubscribe) => unsubscribe());
  };
}

export async function mutateCommunity(path, payload, user, profile) {
  const author = identity(user, profile);
  if (path === "posts") {
    await addDoc(collection(db, "posts"), { ...author, title: payload.title.trim(), body: payload.body.trim(), category: payload.category, status: "active", createdAt: serverTimestamp() });
  } else if (path === "comments") {
    await addDoc(collection(db, "posts", payload.postId, "comments"), { ...author, body: payload.body.trim(), createdAt: serverTimestamp() });
  } else if (path === "react") {
    const reactionRef = doc(db, "posts", payload.postId, "reactions", user.uid);
    const reaction = await getDoc(reactionRef);
    if (reaction.exists()) await deleteDoc(reactionRef);
    else await setDoc(reactionRef, { uid: user.uid, createdAt: serverTimestamp() });
  } else if (path === "challenges") {
    const challengeRef = doc(collection(db, "challenges"));
    const batch = writeBatch(db);
    batch.set(challengeRef, { creatorUid: user.uid, authorName: profile.displayName, authorCity: profile.city, title: payload.title.trim(), summary: payload.summary.trim(), goal: payload.goal.trim(), status: "active", endsAt: Timestamp.fromDate(asDate(payload.endsAt)), createdAt: serverTimestamp() });
    batch.set(doc(db, "challenges", challengeRef.id, "members", user.uid), { uid: user.uid, joinedAt: serverTimestamp() });
    await batch.commit();
  } else if (path === "challenges/join") {
    await setDoc(doc(db, "challenges", payload.challengeId, "members", user.uid), { uid: user.uid, joinedAt: serverTimestamp() });
  } else if (path === "meetups") {
    const meetupRef = doc(collection(db, "meetups"));
    const batch = writeBatch(db);
    batch.set(meetupRef, { creatorUid: user.uid, authorName: profile.displayName, authorCity: profile.city, title: payload.title.trim(), summary: payload.summary.trim(), city: payload.city.trim(), venue: payload.venue.trim(), capacity: Number(payload.capacity), attendeeCount: 1, guardianRequired: true, status: "active", startsAt: Timestamp.fromDate(asDate(payload.startsAt)), createdAt: serverTimestamp() });
    batch.set(doc(db, "meetups", meetupRef.id, "private", "location"), { creatorUid: user.uid, exactLocation: payload.exactLocation.trim() });
    batch.set(doc(db, "meetups", meetupRef.id, "attendees", user.uid), { uid: user.uid, joinedAt: serverTimestamp() });
    await batch.commit();
  } else if (path === "meetups/rsvp") {
    const meetupRef = doc(db, "meetups", payload.meetupId);
    const attendeeRef = doc(db, "meetups", payload.meetupId, "attendees", user.uid);
    await runTransaction(db, async (transaction) => {
      const [meetup, attendee] = await Promise.all([transaction.get(meetupRef), transaction.get(attendeeRef)]);
      if (!meetup.exists()) throw new Error("Meetup not found.");
      const count = meetup.data().attendeeCount || 0;
      if (attendee.exists()) {
        transaction.delete(attendeeRef);
        transaction.update(meetupRef, { attendeeCount: Math.max(0, count - 1) });
      } else {
        if (count >= meetup.data().capacity) throw new Error("This meetup is full.");
        transaction.set(attendeeRef, { uid: user.uid, joinedAt: serverTimestamp() });
        transaction.update(meetupRef, { attendeeCount: count + 1 });
      }
    });
  } else if (path === "reports") {
    await addDoc(collection(db, "reports"), { reporterUid: user.uid, targetType: payload.targetType, targetId: payload.targetId, reason: payload.reason.trim(), status: "open", createdAt: serverTimestamp() });
  } else if (path === "moderate") {
    if (payload.action === "dismiss") {
      await updateDoc(doc(db, "reports", payload.reportId), { status: "dismissed" });
    } else {
      const reportRef = doc(db, "reports", payload.reportId);
      const report = await getDoc(reportRef);
      if (!report.exists()) throw new Error("Report not found.");
      const batch = writeBatch(db);
      batch.update(reportRef, { status: "resolved" });
      batch.update(doc(db, report.data().targetType === "meetup" ? "meetups" : "posts", report.data().targetId), { status: "hidden" });
      await batch.commit();
    }
  } else if (path === "remove/post") {
    await deleteDoc(doc(db, "posts", payload.postId));
  } else if (path === "remove/comment") {
    await deleteDoc(doc(db, "posts", payload.postId, "comments", payload.commentId));
  } else if (path === "remove/challenge") {
    await deleteDoc(doc(db, "challenges", payload.challengeId));
  } else if (path === "remove/meetup") {
    await deleteDoc(doc(db, "meetups", payload.meetupId));
  } else {
    throw new Error("Unknown community action.");
  }
}
