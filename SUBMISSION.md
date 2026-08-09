# Infinite Cinema — Devpost Submission

## Submission links

- Live project: <https://infinite-cinema-demo.jy02145709.chatgpt.site/?v=16>
- Demo video: <https://youtu.be/7quv4-HezwY>
- Public source: <https://github.com/jy02145709/infinite-cinema>
- Partner track: **Parallel**

## Tagline

Turn one cinematic “what if?” into a canon-aware alternate timeline—and let an AI audience judge the result.

## Inspiration

Generative video can create striking images, but a compelling alternate ending needs more than visual novelty. It must understand the original story, change one meaningful cause, preserve continuity, and make the new outcome easy for an audience to understand. We built Infinite Cinema to explore that missing layer between story reasoning and video generation.

## What it does

Infinite Cinema uses *Romeo and Juliet*, a public-domain story, for a focused demonstration: **What if Juliet woke up five seconds earlier?**

The viewer watches a shared setup and compares the original tragedy with a short alternate timeline. The system extracts the scene's visual and narrative DNA, researches canon facts, writes exactly three causal beats, and produces continuity instructions for a future render. An AI Audience then evaluates the result as The Romantic, The Critic, and The Continuity Fan, producing grounded creative verdicts and a consensus score.

## How we built it

The public interactive experience uses Gemini 2.5 Flash on Vertex AI to return structured Scene DNA, timeline beats, continuity guidance, and AI Audience evaluation in one request.

The full agent workflow is implemented with Google ADK and deployed on Vertex AI Agent Engine. A director agent calls Parallel once for bounded public-domain canon research, reasons through the alternate timeline, and calls a render-manifest tool once. The result is an owner-approved manifest with `veo_started: false`.

Veo generated the short comparison assets. New video generation is deliberately separated from analysis: it requires explicit owner confirmation, is limited to one run per day, and displays the maximum estimated cost before a job can start.

## How Parallel is used

Parallel is a functional step in the deployed agent workflow, not a decorative mention. Before inventing a branch, the ADK Director performs one bounded Parallel Search for canonical facts about the public-domain source. The returned context helps distinguish the intentional counterfactual change from an accidental contradiction. The agent then uses that grounded context to construct its three-beat timeline and continuity-safe render manifest.

## Challenges we ran into

The hosted interactive route has a shorter response window than a full remote Agent Engine run. We handled this transparently with two verified paths: a fast, single-request Gemini route for the live audience experience, and the deeper ADK + Parallel workflow deployed and tested independently on Agent Engine.

We also treated cost as a product constraint. Analysis is quota-limited, while video generation cannot happen automatically or through retries. This keeps a public judging demo safe to operate without hiding the real generative workflow.

## Accomplishments that we are proud of

- Built an immediately understandable original-versus-alternate cinematic comparison.
- Deployed and remotely verified a Google ADK agent on Vertex AI Agent Engine.
- Integrated bounded Parallel canon research into the agent's actual reasoning loop.
- Made the reasoning inspectable through Scene DNA, causal beats, and continuity guidance.
- Added three AI Audience perspectives without another model invocation.
- Enforced authentication, daily quotas, scale-to-zero runtime, and an explicit Veo approval boundary.

## What we learned

Believable counterfactual storytelling is primarily a continuity problem. The strongest result came from locking identity, setting, camera language, props, and story state before changing a single causal event. We also learned that expensive media generation should be a separately approved action rather than an automatic final tool call.

## What is next for Infinite Cinema

Next, creators could test several counterfactuals from the same Scene DNA, compare AI Audience reactions across branches, and choose which timeline deserves a full render. The same workflow can expand from *Romeo and Juliet* to a curated library of public-domain stories.

## Built with

- Google Cloud Vertex AI
- Gemini 2.5 Flash
- Google Agent Development Kit (ADK)
- Vertex AI Agent Engine
- Veo image-to-video
- Parallel Search API
- TypeScript, React, and Python

## Testing instructions for judges

1. Open the live project and watch the shared setup.
2. Switch between **Original tragedy** and **What-if timeline**.
3. Select **Load verified demo** for the reliable judging path.
4. Inspect the Scene DNA, three causal beats, continuity direction, and AI Audience consensus.
5. Review **Under the Scene** for evidence of the verified Agent Engine and Parallel workflow.

The optional Veo action is owner-restricted because it starts a billable generation. It is not required to evaluate the submission. A live Gemini request may also be tested while the daily public quota remains available.

## Submission checklist

- [x] Functional hosted project URL
- [x] Public English demo video (2:03)
- [x] Public source repository
- [x] Google Cloud AI is central to the runtime
- [x] Parallel is integrated in the deployed agent workflow
- [x] Setup and run instructions are included in the repository
- [x] Open-source license is included
- [x] Partner track selected: Parallel
- [ ] Create and submit the Devpost project form
- [ ] Recheck all three public links in a signed-out browser

## AI-use disclosure

The project uses Gemini on Vertex AI for structured scene and timeline reasoning, Google ADK and Vertex AI Agent Engine for agent orchestration, Parallel for canon research, and Veo for the project-owned comparison clips. AI Audience results are simulated creative-review personas and are clearly presented as such, not as predictions of real viewers.
