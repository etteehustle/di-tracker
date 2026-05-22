type AppEnvironment = "local" | "production";

type EnvironmentConfig = {
  appName: string;
  name: AppEnvironment;
  storageKey: string;
  auth: {
    enabled: boolean;
  };
  mock: {
    enabled: boolean;
  };
  features: {
    roadmap: boolean;
  };
};

const fallbackEnvironment: AppEnvironment = process.env.NODE_ENV === "production" ? "production" : "local";
const selectedEnvironment = process.env.NEXT_PUBLIC_APP_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "local"
  ? process.env.NEXT_PUBLIC_APP_ENV
  : fallbackEnvironment;
const mockDataEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true";

const environmentConfigs: Record<AppEnvironment, EnvironmentConfig> = {
  local: {
    appName: "DI Tracker",
    name: "local",
    storageKey: "di-tracker-local-state-v1",
    auth: {
      enabled: false
    },
    mock: {
      enabled: mockDataEnabled
    },
    features: {
      roadmap: true
    }
  },
  production: {
    appName: "DI Tracker",
    name: "production",
    storageKey: "di-tracker-state-v1",
    auth: {
      enabled: true
    },
    mock: {
      enabled: mockDataEnabled
    },
    features: {
      roadmap: false
    }
  }
};

export const environment = environmentConfigs[selectedEnvironment];
