export type Region = {
  id: number;
  icon: string | null;
};

export type Buff = {
  id: number;
  icon: string | null;
  name: string;
  effects: number[];
  effectDuration: number;
  effectScope:
    | "ObjectsInArea"
    | "ObjectsInMeta"
    | "Radius"
    | "StreetDistance"
    | "ModuleOwner"
    | "ObjectsInSession"
    | "Local";
  targets: number[];
};

export type BuffEffect = {
  id: number;
  icon: string | null;
  additionalOutputs: {
    additionalOutputCycle: number;
    amount: number;
    forceProductSameAsFactoryOutput: boolean;
    product: number;
  }[];
  additionalWorkforces: number[];
  fireSafety: number;
  happiness: number;
  health: number;
  knowledge: number;
  population: number;
  prestige: number;
  fuelDurationPercent: number;
  isStackable: boolean;
  productivityUpgrade: number;
  replaceWorkforce: {
    newWorkforce: number;
    oldWorkforce: number;
  } | null;
  workforceMaintenanceFactorUpgrade: number;
  workforceModifierInPercent: number;
};

export type BuildingType = "AnimalFarm" | "PlantFarm" | null;

export type BuildingCategory =
  | "Factory"
  | "Public"
  | "BuildingModule"
  | "Warehouse"
  | "Residence"
  | "Logistic"
  | "Other"
  | null;

export type Building = {
  id: number;
  type: BuildingType;
  category: BuildingCategory;
  regions: number[];
  icon: string | null;
  costs: {
    amount: number;
    product: number;
  }[];
  inputs: {
    amount: number;
    product: number;
  }[];
  outputs: {
    amount: number;
    product: number;
  }[];
  maintenance: {
    amount: number;
    product: number;
  }[];
  size: {
    height: number;
    width: number;
  };
  modules: number[];
  moduleBuildRadius: number;
  moduleLimit: number;
  additionalModule: number | null;
  additionalModuleLimit: number;
  additionalModuleMustBeMainBuildingAdjacent: boolean;
  cycleTime: number;
  needsFuel: boolean;
  aqueductProductivityBuff: number | null;
  buffs: number[];
  color: number;
  blocksBuilding: boolean;
  radiusDistance: number;
  streetDistance: number;
};

export type Manifest = {
  version: string;
  timestamp: string;
  assets: string;
  translations: Record<string, string>;
};

export type Assets = {
  buildings: Building[];
  regions: Region[];
  buffs: Buff[];
  buffEffects: BuffEffect[];
};

export type Translations = Record<string, string>;
