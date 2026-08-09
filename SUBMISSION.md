# Infinite Cinema — Submission Draft

## Tagline

Turn one cinematic “what if?” into a canon-aware alternate timeline—and let an AI audience judge the result.

## Inspiration

Generative video can create striking images, but a compelling alternate ending needs more than visual novelty. It must understand the original story, change one meaningful cause, preserve continuity, and make the new outcome easy for an audience to understand. We built Infinite Cinema to explore that missing layer between story reasoning and video generation.

## What it does

Infinite Cinema uses *Romeo and Juliet*, a public-domain story, for a focused demonstration: **What if Juliet woke up five seconds earlier?**

The viewer watches a shared setup and compares the original tragedy with a short alternate timeline. Behind the experience, the system extracts the scene's visual and narrative DNA, researches canon facts, writes exactly three causal beats, and creates continuity instructions for a future render. An AI Audience then evaluates the result as The Romantic, The Critic, and The Continuity Fan, producing persona verdicts and a clear consensus score.

## How we built it

The responsive web experience uses Gemini 2.5 Flash on Vertex AI to return structured Scene DNA, timeline beats, continuity guidance, and AI Audience evaluation in one request.

The full agent workflow is implemented with Google ADK and deployed on Vertex AI Agent Engine. A coordinating director agent calls Parallel exactly once for public-domain canon research, reasons through the alternate timeline, and calls a manifest tool exactly once. It returns an owner-approved render manifest while keeping `veo_started: false`.

Veo generated the short comparison assets, but new video generation is deliberately separated from analysis. It requires an explicit owner confirmation, has a daily limit, and displays the maximum estimated cost before a job can start.

## Why Parallel matters

Parallel gives the agent a grounded canon checkpoint before it invents the alternate timeline. This helps the system distinguish an intentional counterfactual change from an accidental contradiction of the source story.

## Challenges

The hosted interactive route has a shorter response window than a full remote Agent Engine run. We addressed this transparently with two verified paths: a fast, single-request Gemini route for the live audience experience, and the deeper ADK + Parallel workflow deployed and tested independently on Agent Engine.

We also treated cost as a product constraint. Analysis is inexpensive and quota-limited; video generation cannot happen automatically or through retries.

## Accomplishments

- Built a clear original-versus-alternate cinematic comparison.
- Deployed and remotely verified an ADK agent on Vertex AI Agent Engine.
- Integrated Parallel canon research into the agent's reasoning loop.
- Added inspectable Scene DNA, causal beats, and continuity guidance.
- Added three AI Audience personas without an additional model invocation.
- Enforced authentication, daily quotas, scale-to-zero runtime, and an explicit Veo approval boundary.

## Built with

- Google Cloud Vertex AI
- Gemini 2.5 Flash
- Google Agent Development Kit (ADK)
- Vertex AI Agent Engine
- Veo image-to-video
- Parallel API
- TypeScript and React

## What is next

Next we would let creators test multiple counterfactuals from the same Scene DNA, compare audience reactions across branches, and use those signals to select which timeline deserves a full render. We would also expand beyond *Romeo and Juliet* to a curated library of public-domain stories.

## Demo

<https://infinite-cinema-demo.jy02145709.chatgpt.site/?v=16>

The judging deployment is publicly accessible. Paid Veo rendering remains restricted to the project owner.
