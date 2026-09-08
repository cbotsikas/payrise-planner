# PayRise Planner

A local, single-page browser app for planning how to allocate an annual pay-rise budget across a team.

No server, account, or installation is required. Open `index.html` in a modern browser.

**Live app:** [cbotsikas.github.io/payrise-planner](https://cbotsikas.github.io/payrise-planner/)

## What it does

- Add, rename, and remove team members, with their current annual salaries.
- Set the available annual budget in euros or as a percentage of eligible salaries.
- See total team salaries, and exclude an individual salary from the percentage-budget basis when needed.
- Allocate remaining budget automatically to unlocked people in one of two ways:
  - **Equal euro amounts**
  - **Equal percentage increases**, proportional to current salary
- Lock an individual allocation so it remains fixed while the rest is redistributed.
- Adjust an individual increase by slider (0.1 percentage-point increments), percentage, or euro amount.
- Prevent allocations from exceeding the available budget; unallocated budget is allowed.
- See each person’s proposed new annual salary, plus overall budget, allocated amount, and remaining amount.
- Save, name, reorder, restore, inspect, and delete local scenario snapshots.
- Export all planner data as JSON and import it later.

The UI is English; euro and number formatting use German conventions, such as `4.512,43 €`.

## Run locally

1. Clone or download this repository.
2. Open [index.html](index.html) in a modern browser.

Alternatively, serve the folder with any static-file server. No build step or package installation is needed.

## Data and privacy

Current planner data and saved scenarios are stored in the browser’s `localStorage`. Nothing is sent to a remote service.

Use **Export** to create a portable JSON backup before clearing browser data or moving to another browser or device.

Use **Reset plan** to clear custom allocations and fixed amounts while retaining the team, salaries, budget, budget-inclusion choices, and saved scenarios. The retained budget is then split again using the selected automatic mode.

Each allocation slider includes a legend for the amount allocated to that person, the amount still available, and amounts committed to other locked people. The **Auto split** control explains whether a member will change with the available budget or has a fixed allocation.

Use **Clear all data** to permanently remove the active plan and every saved scenario from the current browser.

Use **Hide € amounts** (or `Ctrl+Q`) to toggle visual privacy mode. It replaces digits with random uppercase Greek letters while preserving punctuation; masks are capped at seven letters, so large amounts use a compact pattern such as `ΑΒ.ΓΔΕ,ΖΗ €`. Amount fields omit the euro symbol because their existing suffix supplies it. Privacy mode starts enabled when stored data exists and does not change the stored plan.

When privacy mode is active, a fixed on-screen indicator reminds you that euro amounts are hidden and that `Ctrl+Q` reveals them.

## AI assistance

This project was created with assistance from AI. Review and test the code before using it for decisions that affect people’s pay.

## Project files

- `index.html` — page structure and responsive layout rules
- `styles.css` — visual styling
- `app.js` — allocation logic, persistence, scenarios, and import/export
- `REQUIREMENTS.md` — detailed product requirements

## Development checks

The app intentionally has no dependencies. Validate its JavaScript after a change with:

```sh
node --check app.js
```

## License

Released under the [MIT License](LICENSE). You may use, modify, distribute, sublicense, or sell the project, provided the copyright and license notice are included with substantial copies.
