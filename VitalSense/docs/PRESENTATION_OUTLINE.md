# VitalSense AI - Presentation outline

12-slide source outline for a software engineering project presentation. This is editable presentation content, not an exported PowerPoint file.

## Slide 1 - VitalSense AI
Health signal awareness and explainable risk indicators

Sagnik Pal · Software Engineering Project · November 2026

Speaker note: Introduce VitalSense as an educational prototype derived from MindMate. Validated disease prediction remains future work.

## Slide 2 - Problem and objectives
- Health readings often lack timestamps and context.
- A useful workspace should make patterns understandable and support clinician conversations.
- VitalSense connects recorded signals with reflections, mood and daily habits.

Speaker note: Describe the engineering problem without claiming measured patient outcomes.

## Slide 3 - MindMate adaptation
| Reused foundation | Health-focused change |
| --- | --- |
| Conversational dark interface | VitalSense branding and navigation |
| Starfield and voice orb | Health companion voice experience |
| Journal, mood and goals | Health journal, check-ins and daily habits |
| Cloud and AI integration concepts | Separate configuration, opt-in sharing and snapshots |

Speaker note: Premium payments, unrelated productivity modes and inherited service defaults were removed.

## Slide 4 - Core product workflow
- Log a measurement and the context around it.
- Review a timeline and the rule behind an observation.
- Record a reflection or mood check-in.
- Print a factual visit summary for a clinician conversation.

## Slide 5 - Application architecture
| Component | Responsibility |
| --- | --- |
| React/Vite client | Screens, state and browser persistence |
| Health domain module | Validation and explainable rules |
| Node companion service | Local AI and ElevenLabs requests |
| Optional Firebase adapter | Google sign-in and manual owner-scoped snapshots |

Speaker note: The Node server is local development infrastructure. Production API hardening remains future work.

## Slide 6 - Data model
- Signals preserve time, units, optional values and notes.
- Conversations keep mode and response provenance.
- Journal, mood and habit records support personal context.
- Fictional sample data stays separate from personal entries.

## Slide 7 - Explainable signal observations
- Adult BP categories use an American Heart Association reference.
- Very high readings trigger prompt-attention guidance.
- Pulse patterns compare the latest reading with earlier entries from seven days.
- The +/-15 bpm flag is an experimental heuristic requiring four entries.

Speaker note: Neither rule predicts disease. Source: https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings.

## Slide 8 - Conversational and voice experience
- Health guide, Signal explorer, Mind & mood and Healthy habits modes.
- Guided demo uses explicitly labeled preset replies.
- Optional live AI uses a configured provider through the local server.
- Browser dictation, read-aloud, optional ElevenLabs and the reused animated orb.

Speaker note: Live providers, permissions and audio behavior still require environment-specific acceptance testing.

## Slide 9 - Privacy and control
- Local browser storage by default, with an unencrypted-storage disclosure.
- Live messages and optional measurement context have separate choices.
- Cloud sign-in does not automatically upload records.
- Visit summaries exclude chat, journal and mood content.

## Slide 10 - Verification results
| Check | Verified result |
| --- | --- |
| Health logic | 12 tests passed |
| Guided assistant | 2 tests passed |
| Server handler | 4 tests passed |
| ESLint | Passed |
| Vite production build | Passed |

Speaker note: Browser preview timed out. End-to-end UI, Firebase and live provider checks remain pending. Tests do not establish clinical validity.

## Slide 11 - Limits and future prediction work
- Current release has no trained or clinically validated disease model.
- A predictive extension needs a defined target and suitable consented data.
- Evaluation must address leakage, calibration, subgroup performance and error consequences.
- Wearables, production security and broader usability testing are future work.

## Slide 12 - Demonstration and conclusion
- Open the fictional sample workspace.
- Switch to My data and log a disposable measurement.
- Show a rule explanation, journal entry and habit.
- Finish with Visit summary and the privacy controls.

Speaker note: The project demonstrates an implementable health-awareness workflow. It makes no claim of disease prediction accuracy or clinical readiness.
