import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock3, MapPin, Send, ShieldCheck, Trash2, UserPlus, UsersRound, X } from "../components/icons.jsx";
import {
  loginCommunityAccount,
  logoutCommunityAccount,
  mutateCommunity,
  observeCommunityAuth,
  registerCommunityAccount,
  subscribeCommunity,
} from "../services/communityFirebase.js";

const tabs = [
  ["challenges", "Challenges"],
  ["discussions", "Discussions"],
  ["meetups", "Meetups"],
];

function authErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "An account already uses this email.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/weak-password": "Use a stronger password with at least 8 characters.",
  };
  return messages[error.code] || error.message || "Account access failed. Try again.";
}

function timeAgo(value) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function MeetupDate({ value }) {
  const date = new Date(value);
  return (
    <time className="community-date" dateTime={value}>
      <span>{date.toLocaleDateString("en-AE", { month: "short" })}</span>
      <strong>{date.getDate()}</strong>
    </time>
  );
}

function ReportForm({ targetType, targetId, onSubmit, onClose }) {
  const [reason, setReason] = useState("");
  return (
    <form className="community-report-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ targetType, targetId, reason }); }}>
      <label htmlFor={`report-${targetId}`}>What should moderators review?</label>
      <textarea id={`report-${targetId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} required />
      <div>
        <button className="community-text-button" type="button" onClick={onClose}>Cancel</button>
        <button className="community-button community-button--danger" type="submit">Send report</button>
      </div>
    </form>
  );
}

function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ displayName: "", email: "", password: "", city: "Dubai", ageGroup: "adult", guardianConfirmed: false });
  const [status, setStatus] = useState({ busy: false, error: "" });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setStatus({ busy: true, error: "" });
    try {
      if (mode === "register") await registerCommunityAccount(form);
      else await loginCommunityAccount(form);
      onAuthenticated();
    } catch (error) {
      setStatus({ busy: false, error: authErrorMessage(error) });
    }
  };

  return (
    <section className="community-auth" aria-labelledby="community-auth-title">
      <div className="community-auth__intro">
        <span className="community-auth__icon"><UsersRound className="h-6 w-6" /></span>
        <p className="community-kicker">AfiaCare Community</p>
        <h1 id="community-auth-title">Build healthier routines together</h1>
        <p>Join UAE wellness discussions, shared challenges, and moderated public meetups. Only your display name is public.</p>
        <ul>
          <li><ShieldCheck className="h-4 w-4" /> Reports go to community moderators.</li>
          <li><MapPin className="h-4 w-4" /> Exact meetup locations unlock after RSVP.</li>
          <li><UsersRound className="h-4 w-4" /> Minors join meetups with guardian approval.</li>
        </ul>
      </div>
      <form className="community-auth__form" onSubmit={submit}>
        <div className="community-auth__switch" role="tablist" aria-label="Account access">
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")}>Create account</button>
          <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>Sign in</button>
        </div>
        {mode === "register" ? <>
          <label>Display name<input value={form.displayName} onChange={(event) => update("displayName", event.target.value)} maxLength={50} required /></label>
          <label>UAE city<input value={form.city} onChange={(event) => update("city", event.target.value)} maxLength={50} required /></label>
        </> : null}
        <label>Email<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} required /></label>
        {mode === "register" ? <>
          <label>Age group<select value={form.ageGroup} onChange={(event) => update("ageGroup", event.target.value)}><option value="adult">18 or older</option><option value="under18">Under 18</option></select></label>
          {form.ageGroup === "under18" ? <label className="community-check"><input type="checkbox" checked={form.guardianConfirmed} onChange={(event) => update("guardianConfirmed", event.target.checked)} /> Parent or guardian approves meetup participation.</label> : null}
        </> : null}
        {status.error ? <p className="community-form-error" role="alert">{status.error}</p> : null}
        <button className="community-button community-button--primary" disabled={status.busy}>{status.busy ? "Please wait…" : mode === "register" ? "Create community account" : "Sign in"}</button>
      </form>
    </section>
  );
}

export default function Community() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("discussions");
  const [composer, setComposer] = useState("");
  const [reporting, setReporting] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => observeCommunityAuth((user) => {
    setFirebaseUser(user);
    setData(null);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!firebaseUser) return undefined;
    return subscribeCommunity(firebaseUser, (nextData) => {
      setData(nextData);
      setError("");
    }, (requestError) => setError(requestError.message || "Community sync failed."));
  }, [firebaseUser]);

  const mutate = async (path, payload, success) => {
    setBusy(true);
    setError("");
    try {
      await mutateCommunity(path, payload, firebaseUser, data.user);
      setNotice(success || "Community updated.");
      window.setTimeout(() => setNotice(""), 2600);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const canRemove = (item, ownerKey = "authorUid") => data.user.role === "moderator" || item[ownerKey] === data.user.id;
  const confirmRemove = (label) => window.confirm(`Remove this ${label}? This cannot be undone.`);

  if (!authReady || (firebaseUser && !data)) {
    return <div className="section-pad px-4 md:px-6"><div className="community-loading" role="status" aria-live="polite"><span /><span /><span /><p>Loading your community…</p></div></div>;
  }

  if (!firebaseUser || !data) {
    return <div className="section-pad px-4 md:px-6"><AuthPanel onAuthenticated={() => setError("")} />{error ? <p className="community-form-error mx-auto mt-4 max-w-5xl" role="alert">{error}</p> : null}</div>;
  }

  return (
    <section className="community-shell section-pad px-4 md:px-6" aria-labelledby="community-title">
      <div className="mx-auto max-w-[1480px]">
        <header className="community-header">
          <div>
            <p className="community-kicker">Safe, positive, local</p>
            <h1 id="community-title">AfiaCare Community</h1>
            <p>Shared challenges, practical discussions, and family-friendly UAE meetups.</p>
          </div>
          <div className="community-header__account">
            <span><strong>{data.user.displayName}</strong><small>{data.user.city} · {data.user.role}</small></span>
            <button className="community-text-button" onClick={() => logoutCommunityAccount()}>Sign out</button>
          </div>
        </header>

        <nav className="community-tabs" aria-label="Community sections">
          {tabs.map(([id, label]) => <button key={id} className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? "page" : undefined}>{label}</button>)}
        </nav>

        {notice ? <p className="community-notice" role="status"><CheckCircle2 className="h-4 w-4" /> {notice}</p> : null}
        {error ? <p className="community-form-error" role="alert">{error}</p> : null}

        <div className="community-grid">
          <aside className={`community-column community-column--challenges ${activeTab === "challenges" ? "community-column--active" : ""}`}>
            <div className="community-column__heading"><div><h2>Challenges</h2><p>Small habits, shared momentum.</p></div><button className="community-button community-button--primary" onClick={() => setComposer(composer === "challenge" ? "" : "challenge")}>{composer === "challenge" ? <X className="h-4 w-4" /> : "+"}{composer === "challenge" ? "Close" : "Create"}</button></div>
            {composer === "challenge" ? <form className="community-composer" onSubmit={async (event) => { event.preventDefault(); const formElement = event.currentTarget; const ok = await mutate("challenges", Object.fromEntries(new FormData(formElement)), "Challenge published."); if (ok) { formElement.reset(); setComposer(""); } }}>
              <label>Challenge name<input name="title" maxLength={100} required /></label><label>What will members do?<textarea name="summary" maxLength={500} required /></label><label>Shared goal<input name="goal" maxLength={80} placeholder="Example: 20 shared check-ins" required /></label><label>End date<input name="endsAt" type="date" required /></label><button className="community-button community-button--primary" disabled={busy}>Publish challenge</button>
            </form> : null}
            <div className="community-challenge-list">
              {!data.challenges.length ? <div className="community-empty"><UsersRound className="h-5 w-5" /><h3>No challenges yet</h3><p>Create the first shared wellness goal.</p></div> : null}
              {data.challenges.map((challenge) => (
                <article className="community-challenge" key={challenge.id}>
                  <div className="community-challenge__progress" aria-hidden="true"><span style={{ width: `${Math.min(88, 22 + challenge.memberCount * 12)}%` }} /></div>
                  <h3>{challenge.title}</h3><p>{challenge.summary}</p>
                  <div className="community-meta"><span>{challenge.memberCount} joined</span><span>{challenge.goal}</span></div>
                  <div className="community-record-actions">
                    <button className={`community-button ${challenge.joined ? "community-button--joined" : "community-button--warm"}`} disabled={busy || challenge.joined} onClick={() => mutate("challenges/join", { challengeId: challenge.id }, `Joined ${challenge.title}.`)}>{challenge.joined ? <CheckCircle2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{challenge.joined ? "Joined" : "Join challenge"}</button>
                    {canRemove(challenge, "creatorUid") ? <button className="community-text-button community-text-button--danger" disabled={busy} onClick={() => { if (confirmRemove("challenge")) mutate("remove/challenge", { challengeId: challenge.id }, "Challenge removed."); }}><Trash2 className="h-4 w-4" /> Remove</button> : null}
                  </div>
                </article>
              ))}
            </div>
            {data.moderation ? <section className="community-moderation"><h3><ShieldCheck className="h-4 w-4" /> Moderator queue</h3>{data.moderation.openReports.length ? data.moderation.openReports.map((report) => <div key={report.id}><p>{report.targetType}: {report.reason}</p><span><button onClick={() => mutate("moderate", { reportId: report.id, action: "dismiss" }, "Report dismissed.")}>Dismiss</button><button onClick={() => mutate("moderate", { reportId: report.id, action: "hide" }, "Content hidden.")}>Hide</button></span></div>) : <p>No open reports.</p>}</section> : null}
          </aside>

          <main className={`community-column community-column--discussions ${activeTab === "discussions" ? "community-column--active" : ""}`}>
            <div className="community-column__heading"><div><h2>Discussions</h2><p>Ask, share, and encourage.</p></div><button className="community-button community-button--primary" onClick={() => setComposer(composer === "post" ? "" : "post")}>{composer === "post" ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}{composer === "post" ? "Close" : "New post"}</button></div>
            {composer === "post" ? <form className="community-composer" onSubmit={async (event) => { event.preventDefault(); const formElement = event.currentTarget; const ok = await mutate("posts", Object.fromEntries(new FormData(formElement)), "Discussion published."); if (ok) { formElement.reset(); setComposer(""); } }}>
              <label>Topic<input name="title" maxLength={120} required /></label>
              <label>Category<select name="category"><option>General</option><option>Movement</option><option>Hydration</option><option>Food</option><option>Family</option></select></label>
              <label>Message<textarea name="body" maxLength={1400} required /></label>
              <button className="community-button community-button--primary" disabled={busy}>Publish discussion</button>
            </form> : null}
            <div className="community-feed">
              {!data.discussions.length ? <div className="community-empty"><Send className="h-5 w-5" /><h3>Start the conversation</h3><p>Ask a practical wellness question or share what helped today.</p></div> : null}
              {data.discussions.map((post) => (
                <article className="community-post" key={post.id}>
                  <header><span className="community-avatar">{post.author?.displayName?.slice(0, 1)}</span><div><strong>{post.author?.displayName}</strong><small>{post.author?.city} · {timeAgo(post.createdAt)}</small></div><span className="community-tag">{post.category}</span></header>
                  <h3>{post.title}</h3><p>{post.body}</p>
                  {canRemove(post) ? <div className="community-owner-actions"><button className="community-text-button community-text-button--danger" disabled={busy} onClick={() => { if (confirmRemove("post")) mutate("remove/post", { postId: post.id }, "Post removed."); }}><Trash2 className="h-4 w-4" /> Remove post</button></div> : null}
                  <div className="community-post__actions"><button className={post.reacted ? "is-active" : ""} onClick={() => mutate("react", { postId: post.id })}>♡ {post.reactionCount}</button><button onClick={() => setComposer(composer === post.id ? "" : post.id)}>{post.comments.length} comments</button><button className="is-report" onClick={() => setReporting({ type: "post", id: post.id })}>Report</button></div>
                  {reporting?.type === "post" && reporting.id === post.id ? <ReportForm targetType="post" targetId={post.id} onClose={() => setReporting(null)} onSubmit={(report) => { mutate("reports", report, "Report sent to moderators."); setReporting(null); }} /> : null}
                  {post.comments.length ? <div className="community-comments">{post.comments.map((comment) => <div key={comment.id}><span className="community-avatar community-avatar--small">{comment.author?.displayName?.slice(0, 1)}</span><p><strong>{comment.author?.displayName}</strong><small>{timeAgo(comment.createdAt)}</small>{comment.body}</p></div>)}</div> : null}
                  {composer === post.id ? <form className="community-comment-form" onSubmit={async (event) => { event.preventDefault(); const formElement = event.currentTarget; const ok = await mutate("comments", { postId: post.id, body: new FormData(formElement).get("body") }, "Reply added."); if (ok) { formElement.reset(); setComposer(""); } }}><label className="sr-only" htmlFor={`reply-${post.id}`}>Add a reply</label><input id={`reply-${post.id}`} name="body" placeholder="Add a helpful reply" maxLength={700} required /><button className="community-button community-button--primary" disabled={busy}><Send className="h-4 w-4" /> Post</button></form> : null}
                </article>
              ))}
            </div>
          </main>

          <aside className={`community-column community-column--meetups ${activeTab === "meetups" ? "community-column--active" : ""}`}>
            <div className="community-column__heading"><div><h2>Upcoming meetups</h2><p>Public venues, moderated plans.</p></div><button className="community-button community-button--primary" onClick={() => setComposer(composer === "meetup" ? "" : "meetup")}>{composer === "meetup" ? <X className="h-4 w-4" /> : "+"}{composer === "meetup" ? "Close" : "Create"}</button></div>
            {composer === "meetup" ? <form className="community-composer" onSubmit={async (event) => { event.preventDefault(); const formElement = event.currentTarget; const ok = await mutate("meetups", Object.fromEntries(new FormData(formElement)), "Meetup published."); if (ok) { formElement.reset(); setComposer(""); } }}>
              <label>Meetup name<input name="title" maxLength={100} required /></label><label>Short description<textarea name="summary" maxLength={500} required /></label><label>City<input name="city" defaultValue={data.user.city} required /></label><label>Public venue name<input name="venue" required /></label><label>Exact meeting point <small>Only visible after RSVP</small><input name="exactLocation" required /></label><label>Date and time<input name="startsAt" type="datetime-local" required /></label><label>Capacity<input name="capacity" type="number" min="2" max="100" defaultValue="20" required /></label><button className="community-button community-button--primary" disabled={busy}>Publish meetup</button>
            </form> : null}
            <div className="community-meetup-list">{!data.meetups.length ? <div className="community-empty"><MapPin className="h-5 w-5" /><h3>No upcoming meetups</h3><p>Create a public, family-friendly gathering.</p></div> : null}{data.meetups.map((meetup) => <article className="community-meetup" key={meetup.id}><MeetupDate value={meetup.startsAt} /><div><h3>{meetup.title}</h3><p>{meetup.summary}</p>{canRemove(meetup, "creatorUid") ? <div className="community-owner-actions"><button className="community-text-button community-text-button--danger" disabled={busy} onClick={() => { if (confirmRemove("meetup")) mutate("remove/meetup", { meetupId: meetup.id }, "Meetup removed."); }}><Trash2 className="h-4 w-4" /> Remove meetup</button></div> : null}<span><Clock3 className="h-4 w-4" /> {new Date(meetup.startsAt).toLocaleTimeString("en-AE", { hour: "numeric", minute: "2-digit" })}</span><span><MapPin className="h-4 w-4" /> {meetup.city} · {meetup.venue}</span><p className="community-location"><ShieldCheck className="h-4 w-4" /> {meetup.exactLocation || "Exact location shown after RSVP"}</p><div className="community-meta"><span>{meetup.attendeeCount}/{meetup.capacity} going</span><span>Guardian required for minors</span></div><div className="community-meetup__actions"><button className={`community-button ${meetup.attending ? "community-button--joined" : "community-button--primary"}`} disabled={busy} onClick={() => mutate("meetups/rsvp", { meetupId: meetup.id }, meetup.attending ? "RSVP removed." : "You’re going.")}>{meetup.attending ? "Going ✓" : "RSVP"}</button><button className="community-text-button community-text-button--danger" onClick={() => setReporting({ type: "meetup", id: meetup.id })}>Report</button></div>{reporting?.type === "meetup" && reporting.id === meetup.id ? <ReportForm targetType="meetup" targetId={meetup.id} onClose={() => setReporting(null)} onSubmit={(report) => { mutate("reports", report, "Report sent to moderators."); setReporting(null); }} /> : null}</div></article>)}</div>
          </aside>
        </div>
      </div>
    </section>
  );
}
