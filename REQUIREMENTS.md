# PayRise Planner requirements

PayRise Planner is a single-page, local-first tool for allocating an annual salary-increase budget. The UI is English; currency and number formatting use German Euro conventions (for example `4.512,43 €`). The application starts with an empty team.

The main header stays visible while scrolling and compacts into a smaller title-and-actions bar after it becomes sticky.

## Team and budget

- Team members can be added, renamed, and removed. Each has an editable current annual salary.
- Resetting a plan retains team members, salaries, the budget, budget-inclusion settings, and saved scenarios; it clears allocation locks and custom allocations before returning to the selected automatic split.
- The annual budget can be entered either as a Euro amount or as a percentage. Editing either value calculates the other from the total salaries of currently unlocked team members.
- A budget is a ceiling: allocations may be lower, but never exceed it.
- The overview shows budget, allocated amount, remaining amount, and total team salaries. Each person can be included or excluded from the salary basis used when a percentage budget is entered.

## Allocation behavior

- Every member displays their planned increase as a percentage, Euro amount, slider, and resulting annual salary. The member card keeps the name, salary, allocation fields, and resulting salary in compact columns on wider screens.
- The allocation slider has a text legend identifying the current member allocation, available budget, and budget committed to others; its state is not conveyed by color alone.
- An **Auto split** member updates with available budget, while a locked member is fixed and excluded from automatic redistribution. The control provides an explanatory tooltip.
- Sliders operate in 0.1 percentage-point increments. Any one person can receive the entire available budget.
- The automatic split can allocate the remaining budget either as equal Euro amounts or as equal percentage increases for every unlocked member. Rounding cents are assigned to the final unlocked member.
- Changing a member's slider, percentage, or Euro amount automatically locks that member at that exact allocation. A locked allocation is excluded from automatic redistribution.
- Locking and unlocking a member recalculates equal shares for all unlocked members. This lets a zero-increase starter be kept out of the budget.

## Scenarios and data

- A saved scenario has an editable name and records the team, salaries, allocations, locks, automatic-split mode, budget, timestamp, totals, and remaining amount.
- Saved scenarios remain in browser local storage, can be dragged into a preferred order, expanded to inspect the per-member breakdown, restored, or deleted.
- The complete planner data can be exported as versioned JSON and imported later. Unversioned legacy exports remain supported; unsupported future export versions are rejected.
- A confirmed clear-all action permanently removes the current plan and all saved scenarios from browser storage.
- A visual privacy mode replaces displayed amount digits with random uppercase Greek letters while preserving punctuation. Each numeric value uses the same mask for the current page session regardless of formatting. Masks are capped at seven letters, so large amounts use a compact pattern such as `ΑΒ.ΓΔΕ,ΖΗ €` and cannot reveal a salary range; amount fields omit the euro symbol because their suffix supplies it. It starts enabled when stored data exists, can be toggled from the page or with `Ctrl+Q`, and does not change stored data.
- A fixed on-screen indicator is visible while privacy mode is active.
