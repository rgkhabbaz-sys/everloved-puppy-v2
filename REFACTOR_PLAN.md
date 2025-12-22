# Continuous Streaming Refactor Plan

## Current Problem
- Frontend starts/stops recording per utterance
- New Deepgram connection each time
- Race conditions cause loop to break after 2-3 exchanges

## New Architecture

### Frontend (simple)
- Session start → open mic → stream audio continuously to backend
- Play audio chunks when received
- Barge-in: if speech detected while playing, stop playback

### Backend (controls everything)
- Single persistent Deepgram connection per session
- State machine: LISTENING → PROCESSING → SPEAKING → LISTENING
- Deepgram VAD detects end of speech
- Backend sends: audio chunks, state changes

## Files to Modify
- Backend: VoicePipelineManager.java, DeepgramStreamingClient.java, EaseWebSocketServer.java
- Frontend: patient/page.tsx (simplify significantly)

## Repositories
- Backend: https://github.com/rgkhabbaz-sys/ease-backend
- Frontend: https://github.com/rgkhabbaz-sys/everloved-puppy-v2
