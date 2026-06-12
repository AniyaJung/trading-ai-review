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
    description: "记录和复盘已平仓交易",
    icon: SquarePen,
  },
  {
    id: "rules",
    label: "规则",
    description: "管理入场规则版本",
    icon: ListChecks,
  },
  {
    id: "stats",
    label: "统计",
    description: "查看已确认复盘统计",
    icon: BarChart3,
  },
  {
    id: "backup",
    label: "备份",
    description: "备份和恢复本地数据",
    icon: DatabaseBackup,
  },
  {
    id: "settings",
    label: "设置",
    description: "配置模型和本地数据",
    icon: Settings,
  },
];
