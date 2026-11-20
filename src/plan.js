// No active plan. App.jsx retires every undone plan-* task not listed here (done history stays),
// so an empty PLAN clears the old plan from the app and the sync store.
export const PLAN_VERSION = 'none';
export const PLAN = [];
