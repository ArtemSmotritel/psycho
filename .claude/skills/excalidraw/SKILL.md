---
name: excalidraw
description: Generate any kind of diagram as .excalidraw files — architecture, UML (use case, activity, sequence, class, state, component), flowcharts, ER diagrams, data flow, and more. Use when the user asks to create diagrams, visualize systems, draw UML, generate excalidraw files, or export diagrams to PNG/SVG.
---

# Excalidraw Diagram Generator

Generate diagrams as `.excalidraw` files, with optional export to PNG and SVG.

Supports all diagram types: architecture, use case, activity, sequence, class, state, component, deployment, ER, flowchart, data flow, swimlane, hub-and-spoke, pipeline, and custom layouts.

---

## Quick Start

**User just asks:**
```
"Generate an architecture diagram for this project"
"Draw a use case diagram for the appointment system"
"Create an activity diagram for the client onboarding flow"
"Visualize the database schema as an ER diagram"
"Draw a sequence diagram for the auth flow"
```

**Claude Code will:**
1. Analyze the codebase or use provided information
2. Identify components, actors, relationships, flows
3. Plan layout appropriate to the diagram type
4. Generate valid `.excalidraw` JSON with dynamic IDs and labels
5. Optionally export to PNG and/or SVG using Playwright

**No prerequisites:** Works without existing diagrams or specific file types.

---

## Critical Rules

### 1. NEVER Use Diamond Shapes

Diamond arrow connections are broken in raw Excalidraw JSON. Use styled rectangles instead:

| Semantic Meaning | Rectangle Style |
|------------------|-----------------|
| Orchestrator/Hub | Coral (`#ffa8a8`/`#c92a2a`) + strokeWidth: 3 |
| Decision Point | Orange (`#ffd8a8`/`#e8590c`) + dashed stroke |

### 2. Labels Require TWO Elements

The `label` property does NOT work in raw JSON. Every labeled shape needs:

```json
// 1. Shape with boundElements reference
{
  "id": "my-box",
  "type": "rectangle",
  "boundElements": [{ "type": "text", "id": "my-box-text" }]
}

// 2. Separate text element with containerId
{
  "id": "my-box-text",
  "type": "text",
  "containerId": "my-box",
  "text": "My Label"
}
```

### 3. Elbow Arrows Need Three Properties

For 90-degree corners (not curved):

```json
{
  "type": "arrow",
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

### 4. Arrow Edge Calculations

Arrows must start/end at shape edges, not centers:

| Edge | Formula |
|------|---------|
| Top | `(x + width/2, y)` |
| Bottom | `(x + width/2, y + height)` |
| Left | `(x, y + height/2)` |
| Right | `(x + width, y + height/2)` |

---

## Element Types

| Type | Use For |
|------|---------|
| `rectangle` | Services, databases, containers, orchestrators, UML classes, activities, states |
| `ellipse` | Users/actors, use cases, start/end points |
| `text` | Labels inside shapes, titles, annotations |
| `arrow` | Data flow, connections, dependencies, associations, transitions |
| `line` | Grouping boundaries, separators, swimlane dividers |

**Full JSON format:** See `references/json-format.md`

---

## Diagram Type Guidelines

### Architecture Diagrams
- Vertical flow layout (users -> frontend -> backend -> data layer)
- Color by component type (frontend blue, backend purple, DB green, etc.)
- Use grouping rectangles for logical boundaries

### Use Case Diagrams
- Actors as ellipses on left/right sides
- Use cases as ellipses in center (or rounded rectangles for clarity)
- System boundary as large dashed rectangle
- Associations as simple arrows (no arrowheads or single arrowhead)
- Include/extend as dashed arrows with labels

### Activity Diagrams
- Start: small filled ellipse (dark background)
- End: small filled ellipse with thicker stroke
- Activities: rounded rectangles
- Decision points: orange dashed-stroke rectangles (not diamonds!)
- Arrows with condition labels as standalone text
- Swimlanes: vertical dashed lines with header labels

### Sequence Diagrams
- Participants as rectangles across top row
- Lifelines: dashed vertical lines below each participant
- Messages: horizontal arrows between lifelines, staggered vertically
- Self-calls: U-turn arrows
- Labels on arrows as standalone text

### Class Diagrams
- Classes as rectangles with multi-line text (ClassName\n─────\n+field: Type\n─────\n+method(): Return)
- Inheritance: arrow with triangle head (use `endArrowhead: "triangle"`)
- Association: plain arrow
- Composition/aggregation: arrow with dot (`endArrowhead: "dot"`)

### State Diagrams
- States as rounded rectangles
- Initial state: small dark ellipse
- Final state: double-border ellipse (ellipse with thicker stroke)
- Transitions: arrows with event/condition labels

### ER Diagrams
- Entities as rectangles (colored by domain)
- Attributes listed as multi-line text inside entity
- Relationships as labeled arrows
- Cardinality as standalone text near arrow endpoints (1, *, 0..1, 1..*)

### Flowcharts
- Process steps as rectangles
- Decision points as orange dashed rectangles (not diamonds!)
- Yes/No labels as standalone text near arrows
- Start/End as ellipses

---

## Workflow

### Step 1: Determine Diagram Type and Gather Info

For codebase-based diagrams, discover components:
- `Glob` -> `**/package.json`, `**/Dockerfile`, `**/*.tf`
- `Grep` -> `app.get`, `@Controller`, `CREATE TABLE`
- `Read` -> README, config files, entry points, route definitions

For user-described diagrams, use the provided description.

### Step 2: Plan Layout

**Vertical flow (architecture, activity, flowcharts):**
```
Row positions (y): 100, 230, 380, 530, 680
Column positions (x): 100, 300, 500, 700, 900
Element size: 160-200px x 80-90px
```

**Horizontal flow (sequence, pipelines):**
```
Stage positions (x): 100, 350, 600, 850, 1100
All at same y, arrows left-to-right
```

**Centered (use case):**
```
Actors on sides (x: 50 and x: 900)
Use cases in center (x: 300-600)
System boundary as dashed rectangle
```

**Other patterns:** See `references/examples.md`

### Step 3: Generate Elements

For each component:
1. Create shape with unique `id`
2. Add `boundElements` referencing text
3. Create text with `containerId`
4. Choose color based on type

**Color palettes:** See `references/colors.md`

### Step 4: Add Connections

For each relationship:
1. Calculate source edge point
2. Plan elbow route (avoid overlaps)
3. Create arrow with `points` array
4. Match stroke color to destination type

**Arrow patterns:** See `references/arrows.md`

### Step 5: Add Grouping (Optional)

For logical groupings:
- Large transparent rectangle with `strokeStyle: "dashed"`
- Standalone text label at top-left

### Step 6: Validate and Write

Run validation before writing. Save to `docs/` or user-specified path.

**Validation checklist:** See `references/validation.md`

### Step 7: Export to PNG/SVG (Optional)

After writing the `.excalidraw` file, ask the user if they want PNG, SVG, or both exports.

**Full export procedure:** See `references/export.md`

---

## Quick Arrow Reference

**Straight down:**
```json
{ "points": [[0, 0], [0, 110]], "x": 590, "y": 290 }
```

**L-shape (left then down):**
```json
{ "points": [[0, 0], [-325, 0], [-325, 125]], "x": 525, "y": 420 }
```

**U-turn (callback):**
```json
{ "points": [[0, 0], [50, 0], [50, -125], [20, -125]], "x": 710, "y": 440 }
```

**Arrow width/height** = bounding box of points:
```
points [[0,0], [-440,0], [-440,70]] -> width=440, height=70
```

**Multiple arrows from same edge** - stagger positions:
```
5 arrows: 20%, 35%, 50%, 65%, 80% across edge width
```

---

## Default Color Palette

| Component | Background | Stroke |
|-----------|------------|--------|
| Frontend | `#a5d8ff` | `#1971c2` |
| Backend/API | `#d0bfff` | `#7048e8` |
| Database | `#b2f2bb` | `#2f9e44` |
| Storage | `#ffec99` | `#f08c00` |
| AI/ML | `#e599f7` | `#9c36b5` |
| External APIs | `#ffc9c9` | `#e03131` |
| Orchestration | `#ffa8a8` | `#c92a2a` |
| Message Queue | `#fff3bf` | `#fab005` |
| Cache | `#ffe8cc` | `#fd7e14` |
| Users/Actors | `#e7f5ff` | `#1971c2` |

**UML-specific colors:**

| UML Element | Background | Stroke |
|-------------|------------|--------|
| Actor | `#e7f5ff` | `#1971c2` |
| Use Case | `#d0bfff` | `#7048e8` |
| Activity | `#a5d8ff` | `#1971c2` |
| Decision | `#ffd8a8` | `#e8590c` |
| State | `#b2f2bb` | `#2f9e44` |
| Class/Entity | `#d0bfff` | `#7048e8` |
| System Boundary | transparent | `#495057` (dashed) |
| Start/End | `#1e1e1e` | `#1e1e1e` |

**Cloud-specific palettes:** See `references/colors.md`

---

## Quick Validation Checklist

Before writing file:
- [ ] Every shape with label has boundElements + text element
- [ ] Text elements have containerId matching shape
- [ ] Multi-point arrows have `elbowed: true`, `roundness: null`
- [ ] Arrow x,y = source shape edge point
- [ ] Arrow final point offset reaches target edge
- [ ] No diamond shapes
- [ ] No duplicate IDs

**Full validation algorithm:** See `references/validation.md`

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Labels don't appear | Use TWO elements (shape + text), not `label` property |
| Arrows curved | Add `elbowed: true`, `roundness: null`, `roughness: 0` |
| Arrows floating | Calculate x,y from shape edge, not center |
| Arrows overlapping | Stagger start positions across edge |

**Detailed bug fixes:** See `references/validation.md`

---

## Reference Files

| File | Contents |
|------|----------|
| `references/json-format.md` | Element types, required properties, text bindings |
| `references/arrows.md` | Routing algorithm, patterns, bindings, staggering |
| `references/colors.md` | Default, AWS, Azure, GCP, K8s palettes |
| `references/examples.md` | Complete JSON examples, layout patterns |
| `references/validation.md` | Checklists, validation algorithm, bug fixes |
| `references/export.md` | PNG/SVG export procedure via Playwright |

---

## Output

- **Location:** `docs/diagrams/` or user-specified
- **Filename:** Descriptive, e.g., `use-case-appointments.excalidraw`
- **Exports (optional):** matching `.svg` and/or `.png` in same directory
- **Testing:** Open `.excalidraw` in https://excalidraw.com or VS Code extension
