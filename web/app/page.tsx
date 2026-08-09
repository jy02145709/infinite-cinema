"use client";

import { useEffect, useRef, useState } from "react";
import { sceneData } from "./scene-data";

type Timeline = "original" | "alternative";
type AudienceReaction = { persona: string; lens: string; score: number; verdict: string; improvement: string };
type GeneratedPlan = {
  changedEvent: string;
  newOutcome: string;
  beats: Array<{ time: string; action: string }>;
  generationPrompt: string;
  negativePrompt: string;
  audience: { overallScore: number; consensus: string; reactions: AudienceReaction[] };
};

const timelines = {
  original: {
    eyebrow: "ORIGINAL TIMELINE",
    title: "She wakes too late.",
    description: "Romeo drinks. Only then does Juliet open her eyes.",
    video: "/media/shot-02a-original.mp4",
    outcome: "The tragedy remains.",
  },
  alternative: {
    eyebrow: "ALTERNATIVE TIMELINE",
    title: "She wakes 5 seconds earlier.",
    description: "Juliet reaches for him. Romeo stops before drinking.",
    video: "/media/shot-02b-alternative.mp4",
    outcome: "One moment rewrites the story.",
  },
};

const suggestedQuestions = [
  "What if Juliet woke up 5 seconds earlier?",
  "What if Romeo noticed Juliet's hand move?",
  "What if the poison vial slipped before Romeo drank?",
];

const liveStages = ["Scene DNA locked", "Gemini directing", "Continuity checked", "AI Audience convened"];

export default function Home() {
  const [active, setActive] = useState<Timeline>("alternative");
  const [playing, setPlaying] = useState(false);
  const [whatIfInput, setWhatIfInput] = useState("What if Juliet woke up 5 seconds earlier?");
  const [generated, setGenerated] = useState<GeneratedPlan | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "loading" | "error">("idle");
  const [requestMessage, setRequestMessage] = useState("3 agent generations available per day");
  const [liveStage, setLiveStage] = useState(-1);
  const [renderAccess, setRenderAccess] = useState<{ canRender: boolean; usedToday: number; dailyLimit: number; estimatedCostUsd: number } | null>(null);
  const [costConfirmed, setCostConfirmed] = useState(false);
  const [renderState, setRenderState] = useState<"idle" | "starting" | "rendering" | "completed" | "error">("idle");
  const [renderMessage, setRenderMessage] = useState("No paid render has started.");
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const setupRef = useRef<HTMLVideoElement>(null);
  const branchRef = useRef<HTMLVideoElement>(null);
  const timeline = timelines[active];

  useEffect(() => {
    fetch("/api/render/start").then((response) => response.json()).then(setRenderAccess).catch(() => setRenderAccess(null));
  }, []);

  useEffect(() => () => { if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl); }, [renderedVideoUrl]);

  useEffect(() => {
    if (requestState !== "loading") return;
    const timer = window.setInterval(() => setLiveStage((current) => Math.min(current + 1, liveStages.length - 1)), 2600);
    return () => window.clearInterval(timer);
  }, [requestState]);

  const restart = async () => {
    const setup = setupRef.current;
    const branch = branchRef.current;
    if (!setup || !branch) return;
    setup.currentTime = 0;
    branch.currentTime = 0;
    setPlaying(true);
    await setup.play();
  };

  const playBranch = async () => {
    const branch = branchRef.current;
    if (!branch) return;
    branch.currentTime = 0;
    await branch.play();
  };

  const submitWhatIf = async (event: React.FormEvent) => {
    event.preventDefault();
    setLiveStage(0);
    setRequestState("loading");
    setRequestMessage("Gemini is directing a continuity-locked timeline…");
    try {
      const response = await fetch("/api/timeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatIf: whatIfInput }) });
      const body = await response.json() as { timeline?: typeof generated; remaining?: number; error?: string };
      if (!response.ok || !body.timeline) throw new Error(body.error ?? "Timeline generation failed.");
      setGenerated(body.timeline);
      setRequestState("idle");
      setLiveStage(liveStages.length);
      setRequestMessage(`${body.remaining ?? 0} agent generations remaining today · Veo not started`);
    } catch (error) {
      setRequestState("error");
      setLiveStage(-1);
      setRequestMessage(error instanceof Error ? error.message : "Timeline generation failed.");
    }
  };

  const loadVerifiedDemo = () => {
    setGenerated({
      changedEvent: sceneData.alternativeTimeline.changedEvent,
      newOutcome: sceneData.alternativeTimeline.newOutcome,
      beats: sceneData.alternativeTimeline.beats.map((beat) => ({ time: beat.time, action: beat.action })),
      generationPrompt: sceneData.alternativeTimeline.generationPrompt,
      negativePrompt: sceneData.alternativeTimeline.negativePrompt,
      audience: {
        overallScore: 91,
        consensus: "The changed cause is instantly readable, emotionally satisfying, and visually continuous with the shared setup.",
        reactions: [
          { persona: "The Romantic", lens: "Emotional payoff", score: 96, verdict: "Her reaching hand turns inevitable tragedy into immediate hope.", improvement: "Hold their first eye contact for one extra beat." },
          { persona: "The Critic", lens: "Story causality", score: 88, verdict: "One precise change creates a clean and understandable new outcome.", improvement: "Keep the untouched poison vial visible in the final frame." },
          { persona: "The Continuity Fan", lens: "Visual consistency", score: 90, verdict: "The vial, staging, lighting, and character positions remain convincingly locked.", improvement: "Match Romeo's hand position exactly at the branch point." },
        ],
      },
    });
    setRequestState("idle");
    setLiveStage(liveStages.length);
    setRequestMessage("Verified agent demo plan loaded · Veo not started");
  };

  const startVeoRender = async () => {
    if (!generated || !costConfirmed) return;
    setRenderState("starting");
    setRenderMessage("Submitting one billable six-second Veo render…");
    try {
      const imageResponse = await fetch("/media/shot-01-reference.png");
      if (!imageResponse.ok) throw new Error("Reference image could not be loaded.");
      const imageBase64 = await blobToBase64(await imageResponse.blob());
      const response = await fetch("/api/render/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: generated.generationPrompt, negativePrompt: generated.negativePrompt, imageBase64, confirmCost: true }) });
      const body = await response.json() as { renderId?: string; error?: string };
      if (!response.ok || !body.renderId) throw new Error(body.error ?? "Veo render could not be started.");
      setRenderState("rendering");
      setRenderMessage("Veo is rendering. This usually takes a few minutes; keep this tab open.");
      await pollRender(body.renderId);
    } catch (error) {
      setRenderState("error");
      setRenderMessage(error instanceof Error ? error.message : "Veo render failed.");
    }
  };

  const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Reference image could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });

  const pollRender = async (renderId: string) => {
    for (;;) {
      await new Promise((resolve) => window.setTimeout(resolve, 10_000));
      const response = await fetch("/api/render/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ renderId }) });
      const body = await response.json() as { status?: string; videoBase64?: string; mimeType?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Veo status check failed.");
      if (body.status !== "completed" || !body.videoBase64) continue;
      const binary = atob(body.videoBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      setRenderedVideoUrl(URL.createObjectURL(new Blob([bytes], { type: body.mimeType ?? "video/mp4" })));
      setRenderState("completed");
      setRenderMessage("Render complete. The daily Veo allowance is now used.");
      setRenderAccess((current) => current ? { ...current, usedToday: current.dailyLimit } : current);
      return;
    }
  };

  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Infinite Cinema home">
          <span className="brandMark">∞</span>
          <span>INFINITE CINEMA</span>
        </a>
        <div className="navMeta">
          <span className="statusDot" />
          LIVE PROTOTYPE
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="heroCopy">
          <p className="kicker">A WHAT-IF STORY ENGINE</p>
          <h1>One moment.<br /><em>Another timeline.</em></h1>
          <p className="lede">
            Infinite Cinema understands a scene, changes one event, and generates
            the story that could have followed.
          </p>
        </div>
        <div className="questionCard">
          <span>WHAT IF...</span>
          <strong>Juliet woke up<br />5 seconds earlier?</strong>
          <div className="questionLine" />
          <small>ROMEO &amp; JULIET · ACT V</small>
        </div>
      </section>

      <section className="experience" aria-labelledby="experience-title">
        <div className="sectionHeading">
          <div>
            <p className="kicker">THE BRANCH POINT</p>
            <h2 id="experience-title">Watch one scene become two.</h2>
          </div>
          <button className="replayButton" onClick={restart} type="button">
            <span aria-hidden="true">▶</span> Play from the shared moment
          </button>
        </div>

        <div className="stage">
          <article className="videoCard sharedCard">
            <div className="cardLabel">
              <span>01</span>
              <div><small>SHARED SETUP</small><strong>The same final moment</strong></div>
            </div>
            <div className="videoFrame">
              <video
                ref={setupRef}
                src="/media/shot-01.mp4"
                poster="/media/shot-01-reference.png"
                playsInline
                muted
                onEnded={playBranch}
                onPause={() => setPlaying(false)}
                aria-label="Shared setup: Romeo kneels beside sleeping Juliet"
              />
              {!playing && <button className="centerPlay" onClick={restart} aria-label="Play shared setup">▶</button>}
            </div>
            <p>Romeo raises the poison. Juliet is still asleep.</p>
          </article>

          <div className="branchColumn" aria-hidden="true">
            <span className="branchNode">IF</span>
            <span className="branchStem" />
            <span className="branchArrow">→</span>
          </div>

          <article className={`videoCard resultCard ${active}`}>
            <div className="cardLabel">
              <span>02</span>
              <div><small>{timeline.eyebrow}</small><strong>{timeline.title}</strong></div>
            </div>
            <div className="timelineTabs" role="tablist" aria-label="Choose timeline">
              <button
                role="tab"
                aria-selected={active === "original"}
                onClick={() => { setActive("original"); setPlaying(false); }}
              >Original</button>
              <button
                role="tab"
                aria-selected={active === "alternative"}
                onClick={() => { setActive("alternative"); setPlaying(false); }}
              >What if?</button>
            </div>
            <div className="videoFrame">
              <video
                key={active}
                ref={branchRef}
                src={timeline.video}
                playsInline
                muted
                controls
                aria-label={`${timeline.eyebrow}: ${timeline.description}`}
              />
              <div className="timelineBadge">{active === "original" ? "TOO LATE" : "5 SECONDS EARLIER"}</div>
              <div className="causeRibbon"><span>{active === "original" ? "ROMEO DRINKS" : "JULIET WAKES"}</span><i>→</i><strong>{active === "original" ? "JULIET WAKES" : "ROMEO STOPS"}</strong></div>
            </div>
            <p>{timeline.description}</p>
            <div className="outcome"><span>OUTCOME</span>{timeline.outcome}</div>
          </article>
        </div>
      </section>

      <section className="pipeline" aria-labelledby="pipeline-title">
        <p className="kicker">UNDER THE SCENE</p>
        <h2 id="pipeline-title">From video to a new possibility.</h2>
        <div className="pipelineGrid">
          <div><span>01</span><strong>Scene DNA</strong><p>Characters, setting, mood, camera, and story state are understood.</p></div>
          <div><span>02</span><strong>Canon Research</strong><p>Parallel verifies the original event against the public-domain story.</p></div>
          <div><span>03</span><strong>What-if Direction</strong><p>The agent changes one event while visual and causal continuity stay locked.</p></div>
          <div><span>04</span><strong>Owner-approved Veo</strong><p>A render can start only after its cost is shown and the owner confirms it.</p></div>
        </div>
        <aside className="agentProof" aria-label="Verified Agent Engine run">
          <div><small>VERIFIED AGENT ENGINE RUN</small><strong>Canon checked before invention.</strong><p>The deployed ADK Director completed one bounded Parallel Search, then created one owner-approved render manifest. Veo remained off.</p></div>
          <blockquote>“Romeo drinks the poison before Juliet awakens in Act V.”</blockquote>
          <div className="proofMeta"><span>PARALLEL SEARCH · 1 CALL</span><span>RENDER MANIFEST · APPROVED</span><span>VEO_STARTED · FALSE</span><a href="https://www.folger.edu/explore/shakespeares-works/romeo-and-juliet/read/5/3/" target="_blank" rel="noreferrer">View public-domain scene ↗</a></div>
        </aside>
      </section>

      <section className="analysis" aria-labelledby="analysis-title">
        <div className="analysisIntro">
          <div>
            <p className="kicker">LIVE GEMINI ANALYSIS</p>
            <h2 id="analysis-title">The scene, understood.</h2>
          </div>
          <div className="modelStamp"><span className="statusDot" />ANALYZED BY {sceneData.model.toUpperCase()}</div>
        </div>

        <div className="analysisGrid">
          <article className="dnaPanel">
            <div className="panelTop"><span>SCENE DNA</span><small>01 / SOURCE</small></div>
            <p className="dnaSummary">{sceneData.sceneDNA.summary}</p>
            <dl className="facts">
              <div><dt>LOCATION</dt><dd>{sceneData.sceneDNA.location}</dd></div>
              <div><dt>LIGHT</dt><dd>{sceneData.sceneDNA.visualStyle.lighting}</dd></div>
              <div><dt>CAMERA</dt><dd>{sceneData.sceneDNA.visualStyle.camera}</dd></div>
              <div><dt>PACING</dt><dd>{sceneData.sceneDNA.visualStyle.pacing}</dd></div>
            </dl>
            <div className="characterRows">
              {sceneData.sceneDNA.characters.map((character) => (
                <div key={character.id}><strong>{character.id}</strong><span>{character.emotion}</span><small>{character.action}</small></div>
              ))}
            </div>
            <div className="lockGroup"><span>CONTINUITY LOCKS</span><div>{sceneData.sceneDNA.continuityLocks.map((lock) => <b key={lock}>{lock}</b>)}</div></div>
          </article>

          <article className="timelinePanel">
            <div className="panelTop"><span>WHAT-IF TIMELINE</span><small>02 / BRANCH</small></div>
            <blockquote>“{sceneData.whatIf}”</blockquote>
            <div className="changeCard"><small>CHANGED EVENT</small><strong>{sceneData.alternativeTimeline.changedEvent}</strong></div>
            <div className="beatList">
              {sceneData.alternativeTimeline.beats.map((beat, index) => (
                <div key={beat.time}><span>{beat.time}</span><i>{index + 1}</i><p>{beat.action}</p></div>
              ))}
            </div>
            <div className="generatedOutcome"><small>GENERATED OUTCOME</small><p>{sceneData.alternativeTimeline.newOutcome}</p></div>
          </article>
        </div>
      </section>

      <section className="generator" aria-labelledby="generator-title">
        <div className="generatorIntro">
          <p className="kicker">TRY A NEW TIMELINE</p>
          <h2 id="generator-title">Change one moment.</h2>
          <p>The Infinite Cinema agent researches the source and plans a continuity-locked six-second branch. It never starts a paid Veo render automatically.</p>
        </div>
        <form className="whatIfForm" onSubmit={submitWhatIf}>
          <label htmlFor="what-if-input">WHAT IF...</label>
          <textarea id="what-if-input" value={whatIfInput} onChange={(event) => setWhatIfInput(event.target.value)} maxLength={220} rows={3} />
          <div className="suggestionChips" aria-label="Suggested what-if questions">{suggestedQuestions.map((question) => <button key={question} type="button" onClick={() => setWhatIfInput(question)}>{question}</button>)}</div>
          {(requestState === "loading" || liveStage === liveStages.length) && <div className="liveProgress" aria-label="Live generation progress">{liveStages.map((stage, index) => <div className={index < liveStage || liveStage === liveStages.length ? "done" : index === liveStage ? "active" : ""} key={stage}><i>{index < liveStage || liveStage === liveStages.length ? "✓" : index + 1}</i><span>{stage}</span></div>)}</div>}
          <div className="formFooter"><span className={requestState === "error" ? "formError" : ""}>{requestMessage}</span><div className="formActions"><button className="secondaryAction" onClick={loadVerifiedDemo} type="button">Load verified demo</button><button disabled={requestState === "loading"} type="submit">{requestState === "loading" ? "Generating…" : "Generate timeline"}</button></div></div>
        </form>
        {generated && <article className="generatedPlan">
          <div><small>CHANGED EVENT</small><h3>{generated.changedEvent}</h3><small>NEW OUTCOME</small><p>{generated.newOutcome}</p></div>
          <div className="generatedBeats">{generated.beats.map((beat) => <div key={`${beat.time}-${beat.action}`}><span>{beat.time}</span><p>{beat.action}</p></div>)}</div>
          <section className="audiencePanel" aria-labelledby="audience-verdict-title">
            <div className="audienceSummary"><div><small>AI AUDIENCE VERDICT</small><h3 id="audience-verdict-title">Would the audience believe this timeline?</h3></div><strong><b>{generated.audience.overallScore}</b><span>/ 100</span></strong></div>
            <p className="audienceDisclosure">VIRTUAL CREATIVE REVIEW · NOT A PREDICTION OF REAL AUDIENCE BEHAVIOR</p>
            <p className="audienceConsensus">{generated.audience.consensus}</p>
            <div className="audienceReactions">{generated.audience.reactions.map((reaction) => <article key={reaction.persona}><div><small>{reaction.lens}</small><b>{reaction.score}</b></div><h4>{reaction.persona}</h4><p>{reaction.verdict}</p><em><span>DIRECTOR NOTE</span>{reaction.improvement}</em></article>)}</div>
          </section>
          <details><summary>Veo generation prompt</summary><p>{generated.generationPrompt}</p></details>
          <div className="renderGate">
            {!renderAccess?.canRender ? <div className="costLock">OWNER-ONLY VEO RENDER · PUBLIC VISITORS CANNOT CREATE COST</div> : <>
              <div className="renderCost"><strong>Optional Veo render</strong><span>6 seconds · up to ≈ ${renderAccess.estimatedCostUsd.toFixed(2)} · {renderAccess.dailyLimit - renderAccess.usedToday} of {renderAccess.dailyLimit} available today</span></div>
              <label className="costConfirm"><input type="checkbox" checked={costConfirmed} onChange={(event) => setCostConfirmed(event.target.checked)} disabled={renderAccess.usedToday >= renderAccess.dailyLimit || renderState === "rendering" || renderState === "starting"} /><span>I understand that clicking render starts a billable Google Cloud request.</span></label>
              <button className="renderButton" type="button" onClick={startVeoRender} disabled={!costConfirmed || renderAccess.usedToday >= renderAccess.dailyLimit || renderState === "rendering" || renderState === "starting" || renderState === "completed"}>{renderState === "starting" ? "Submitting…" : renderState === "rendering" ? "Rendering…" : renderAccess.usedToday >= renderAccess.dailyLimit ? "Daily limit reached" : "Render with Veo"}</button>
              <p className={renderState === "error" ? "renderError" : "renderStatus"}>{renderMessage}</p>
              {renderedVideoUrl && <div className="renderedVideo"><video src={renderedVideoUrl} controls playsInline autoPlay muted aria-label="Newly generated silent alternative timeline" /><a href={renderedVideoUrl} download="infinite-cinema-veo.mp4">Download video</a></div>}
            </>}
          </div>
        </article>}
      </section>

      <footer>
        <span>INFINITE CINEMA</span>
        <p>Every story contains the one that almost happened.</p>
        <small>POWERED BY GOOGLE CLOUD · ADK · GEMINI · PARALLEL · VEO</small>
      </footer>
    </main>
  );
}
