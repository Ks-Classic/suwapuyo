# YOUR TIME Platform Demo — Detail Spec v0.1

> Created: 2026-05-06
> Scope: Add a lightweight YOUR TIME platform demo on top of the existing SuwaPuyo MVP.
> Principle: Do not replace the paper stamp rally. Use SuwaPuyo as the post-event reflection and gentle connection layer.

---

## 1. Context

YOUR TIME is not just a short event. It can become a year-round relationship platform where families meet health and mibyo themes, discover exhibitors, and keep learning after the event.

The existing SuwaPuyo game already has four characters:

| Character | Current game role | YOUR TIME theme |
|---|---|---|
| すーすー | blob, 3-match, soft/restful character | sleep, rest, breathing, recovery |
| わーわー | tooth, 4-match | oral care, smile, family conversation |
| わのの | ghost, 4-match | mibyo, body signals, prevention |
| たぬぺい | tanuki, 5-match, coin effect | continuity, community economy, exhibitor ecosystem |

## 2. Product Thesis

SuwaPuyo should not become a sponsor ad wall.

It should become a family-friendly reflection experience:

```text
Play at YOUR TIME
  -> answer a short family reflection
  -> receive a gentle character theme
  -> discover 2-3 next entrances
  -> continue with SNS / video / exhibitor content
```

## 3. Goals

1. Increase parents' unconscious health and mibyo awareness after visiting YOUR TIME.
2. Help families discover exhibitors they could not visit during the event.
3. Give exhibitors meaningful post-event touchpoints without turning the event into a sales funnel.
4. Preserve the paper stamp rally as the tactile child-facing activity.
5. Keep the first demo small enough to show in about 10 minutes.

## 4. Non-Goals

- Medical diagnosis.
- Ranking exhibitors.
- Replacing the physical stamp rally.
- Building a full CRM or lead marketplace in the first demo.
- Showing recommendations based on sponsorship amount.

## 5. Demo User Flow

### Screen A: Existing SuwaPuyo Game

The current game remains the first screen. A new panel/button introduces:

```text
YOUR TIME ふりかえり診断
```

### Screen B: Three-Question Reflection

Parents answer three simple questions:

1. What did your family feel most curious about today?
2. What would be easiest to try at home this week?
3. What kind of expert or content would you like to meet next?

Each answer maps to one of the four character themes.

### Screen C: Family Theme Result

The result shows:

- Character type
- A short positive message
- One small weekly action
- Three "next entrances"

Recommendations must be phrased as "next entrances", not rankings.

### Screen D: Exhibitor / Content Connection

Show three types of gentle connection:

- Learn: YouTube / Instagram / short article
- Meet: exhibitor profile
- Try: small home action or event follow-up

## 6. Recommendation Fairness Rules

To protect YOUR TIME's flatness:

1. Show at most three recommendations per result.
2. Do not call them "best" or "rank".
3. Use "next entrance" language.
4. Always include the full exhibitor/content directory path conceptually.
5. Do not sort by sponsorship amount.
6. Balance categories when possible.
7. Explain why the recommendation appears.
8. Keep all suggestions as education, reflection, or consultation prompts, not medical advice.

## 7. First Demo Data

The first demo uses four mock themes:

- `rest`: すーすー
- `oral`: わーわー
- `mibyo`: わのの
- `continuity`: たぬぺい

Each theme has:

- `characterName`
- `themeTitle`
- `resultCopy`
- `weeklyAction`
- `recommendations[]`

## 8. Implementation Plan

### Current Implementation Facts

- App entry: `src/App.tsx`
- Main screen: `src/components/screens/DemoScreen.tsx`
- Styling: `src/styles/demo.module.css` and `src/styles/index.css`
- Character constants are duplicated inside `DemoScreen.tsx` rather than imported from `src/config/puyoTypes.ts`.
- Game logic and PixiJS rendering live in one large file. Avoid deep refactor for this demo.

### New Files

- `src/config/yourTimePlatform.ts`
  - theme and recommendation data
- `src/components/YourTimeReflectionDemo.tsx`
  - three-question reflection and result panel

### Modified Files

- `src/components/screens/DemoScreen.tsx`
  - render the new reflection panel below the game UI
- `src/styles/demo.module.css`
  - add compact responsive panel styles

## 9. Acceptance Criteria

- Existing SuwaPuyo game still loads and plays.
- A visitor can open the YOUR TIME reflection demo without leaving the game.
- The parent can answer three questions and see one character result.
- Result includes one weekly action and three next entrances.
- Copy avoids diagnosis, ranking, and hard sales.
- `npm run build` succeeds.

