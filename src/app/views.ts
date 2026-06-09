import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  DatabaseBackup,
  ListChecks,
  Settings,
  SquarePen,
} from "lucide-react";

export type AppView = "trades" | "rules" | "stats" | "backup" | "settings";

export type NavigationItem = {
  id: AppView;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  {
    id: "trades",
    label: "交易",
    description: "已平仓交易记录",
    icon: SquarePen,
  },
  {
    id: "rules",
    label: "规则",
    description: "入场规则版本",
    icon: ListChecks,
  },
  {
    id: "stats",
    label: "统计",
    description: "确认复盘口径",
    icon: BarChart3,
  },
  {
    id: "backup",
    label: "备份",
    description: "本地数据保护",
    icon: DatabaseBackup,
  },
  {
    id: "settings",
    label: "设置",
    description: "模型与数据目录",
    icon: Settings,
  },
];
