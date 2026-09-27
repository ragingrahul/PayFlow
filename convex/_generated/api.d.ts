/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as adjustmentService from "../adjustmentService.js";
import type * as adjustments from "../adjustments.js";
import type * as compensationService from "../compensationService.js";
import type * as copilot from "../copilot.js";
import type * as dashboard from "../dashboard.js";
import type * as employees from "../employees.js";
import type * as migrations from "../migrations.js";
import type * as payroll from "../payroll.js";
import type * as payrollService from "../payrollService.js";
import type * as scenarios from "../scenarios.js";
import type * as seed from "../seed.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  adjustmentService: typeof adjustmentService;
  adjustments: typeof adjustments;
  compensationService: typeof compensationService;
  copilot: typeof copilot;
  dashboard: typeof dashboard;
  employees: typeof employees;
  migrations: typeof migrations;
  payroll: typeof payroll;
  payrollService: typeof payrollService;
  scenarios: typeof scenarios;
  seed: typeof seed;
  workspace: typeof workspace;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
