/* eslint-disable */
// @ts-nocheck
// Generated Route Tree for TanStack Router

import { Route as rootRouteImport } from "./routes/__root";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as InfrastructureRouteImport } from "./routes/infrastructure";
import { Route as ContainmentRouteImport } from "./routes/containment";
import { Route as SecurityAlertsRouteImport } from "./routes/security-alerts";
import { Route as InvestigationsRouteImport } from "./routes/investigations";
import { Route as BlastRadiusRouteImport } from "./routes/blast-radius";
import { Route as ReportsRouteImport } from "./routes/reports";
import { Route as HistoryRouteImport } from "./routes/history";
import { Route as SettingsRouteImport } from "./routes/settings";

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRouteImport,
} as any);

const InfrastructureRoute = InfrastructureRouteImport.update({
  id: "/infrastructure",
  path: "/infrastructure",
  getParentRoute: () => rootRouteImport,
} as any);

const ContainmentRoute = ContainmentRouteImport.update({
  id: "/containment",
  path: "/containment",
  getParentRoute: () => rootRouteImport,
} as any);

const SecurityAlertsRoute = SecurityAlertsRouteImport.update({
  id: "/security-alerts",
  path: "/security-alerts",
  getParentRoute: () => rootRouteImport,
} as any);

const InvestigationsRoute = InvestigationsRouteImport.update({
  id: "/investigations",
  path: "/investigations",
  getParentRoute: () => rootRouteImport,
} as any);

const BlastRadiusRoute = BlastRadiusRouteImport.update({
  id: "/blast-radius",
  path: "/blast-radius",
  getParentRoute: () => rootRouteImport,
} as any);

const ReportsRoute = ReportsRouteImport.update({
  id: "/reports",
  path: "/reports",
  getParentRoute: () => rootRouteImport,
} as any);

const HistoryRoute = HistoryRouteImport.update({
  id: "/history",
  path: "/history",
  getParentRoute: () => rootRouteImport,
} as any);

const SettingsRoute = SettingsRouteImport.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => rootRouteImport,
} as any);

export interface FileRoutesByFullPath {
  "/": typeof IndexRoute;
  "/infrastructure": typeof InfrastructureRoute;
  "/containment": typeof ContainmentRoute;
  "/security-alerts": typeof SecurityAlertsRoute;
  "/investigations": typeof InvestigationsRoute;
  "/blast-radius": typeof BlastRadiusRoute;
  "/reports": typeof ReportsRoute;
  "/history": typeof HistoryRoute;
  "/settings": typeof SettingsRoute;
}

export interface FileRoutesByTo {
  "/": typeof IndexRoute;
  "/infrastructure": typeof InfrastructureRoute;
  "/containment": typeof ContainmentRoute;
  "/security-alerts": typeof SecurityAlertsRoute;
  "/investigations": typeof InvestigationsRoute;
  "/blast-radius": typeof BlastRadiusRoute;
  "/reports": typeof ReportsRoute;
  "/history": typeof HistoryRoute;
  "/settings": typeof SettingsRoute;
}

export interface FileRoutesById {
  __root__: typeof rootRouteImport;
  "/": typeof IndexRoute;
  "/infrastructure": typeof InfrastructureRoute;
  "/containment": typeof ContainmentRoute;
  "/security-alerts": typeof SecurityAlertsRoute;
  "/investigations": typeof InvestigationsRoute;
  "/blast-radius": typeof BlastRadiusRoute;
  "/reports": typeof ReportsRoute;
  "/history": typeof HistoryRoute;
  "/settings": typeof SettingsRoute;
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath;
  fullPaths:
    | "/"
    | "/infrastructure"
    | "/containment"
    | "/security-alerts"
    | "/investigations"
    | "/blast-radius"
    | "/reports"
    | "/history"
    | "/settings";
  fileRoutesByTo: FileRoutesByTo;
  to:
    | "/"
    | "/infrastructure"
    | "/containment"
    | "/security-alerts"
    | "/investigations"
    | "/blast-radius"
    | "/reports"
    | "/history"
    | "/settings";
  id:
    | "__root__"
    | "/"
    | "/infrastructure"
    | "/containment"
    | "/security-alerts"
    | "/investigations"
    | "/blast-radius"
    | "/reports"
    | "/history"
    | "/settings";
  fileRoutesById: FileRoutesById;
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute;
  InfrastructureRoute: typeof InfrastructureRoute;
  ContainmentRoute: typeof ContainmentRoute;
  SecurityAlertsRoute: typeof SecurityAlertsRoute;
  InvestigationsRoute: typeof InvestigationsRoute;
  BlastRadiusRoute: typeof BlastRadiusRoute;
  ReportsRoute: typeof ReportsRoute;
  HistoryRoute: typeof HistoryRoute;
  SettingsRoute: typeof SettingsRoute;
}

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/infrastructure": {
      id: "/infrastructure";
      path: "/infrastructure";
      fullPath: "/infrastructure";
      preLoaderRoute: typeof InfrastructureRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/containment": {
      id: "/containment";
      path: "/containment";
      fullPath: "/containment";
      preLoaderRoute: typeof ContainmentRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/security-alerts": {
      id: "/security-alerts";
      path: "/security-alerts";
      fullPath: "/security-alerts";
      preLoaderRoute: typeof SecurityAlertsRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/investigations": {
      id: "/investigations";
      path: "/investigations";
      fullPath: "/investigations";
      preLoaderRoute: typeof InvestigationsRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/blast-radius": {
      id: "/blast-radius";
      path: "/blast-radius";
      fullPath: "/blast-radius";
      preLoaderRoute: typeof BlastRadiusRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/reports": {
      id: "/reports";
      path: "/reports";
      fullPath: "/reports";
      preLoaderRoute: typeof ReportsRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/history": {
      id: "/history";
      path: "/history";
      fullPath: "/history";
      preLoaderRoute: typeof HistoryRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/settings": {
      id: "/settings";
      path: "/settings";
      fullPath: "/settings";
      preLoaderRoute: typeof SettingsRouteImport;
      parentRoute: typeof rootRouteImport;
    };
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute,
  InfrastructureRoute,
  ContainmentRoute,
  SecurityAlertsRoute,
  InvestigationsRoute,
  BlastRadiusRoute,
  ReportsRoute,
  HistoryRoute,
  SettingsRoute,
};

export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>();
