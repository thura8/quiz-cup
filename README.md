# quiz-cup-ui

Standalone Quiz Cup UI playground, split out of `dd-join-joy-frontend`.
Frontend only: no LINE/LIFF, no backend, no recording. An in-browser mock
room (`mock/engine.ts`) plays the server's role, with bots and mock questions.

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

| Route      | What                                                                 |
| ---------- | -------------------------------------------------------------------- |
| `/host`    | Big screen: lobby + QR → settings → 3D arena → reveal → podium        |
| `/player`  | Phone: name → waiting room → answer/wager/tactic → result → summary  |
| `/gallery` | Every screen in a fixed state (from the original design-system page) |

The wrench button (bottom-left) opens mock controls: add bot, start (player
demo), skip the current timer, bots on/off, restart, switch view.

## Layout

- `components/quiz-cup/**` – the Quiz Cup UI, copied as-is (QuizCupGame rewired to the mock)
- `components/common/**`, `components/ui/**` – shared screens and shadcn/base-ui parts
- `mock/questions.ts` – question bank (12 categories, easy/medium/hard)
- `mock/engine.ts` – room state machine, scoring, bots, and the API view shapes
- `hooks/quiz-cup/useMockQuizCupRoom.ts` – same surface as the real `useQuizCupRoom`
- `types/quiz-cup-room.ts` – the server view contract; keep in sync with the backend

`pnpm test` runs the scoring and engine tests; `pnpm typecheck` and `pnpm lint` as usual.
