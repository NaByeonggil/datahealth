"use client";

import { Card, CardContent } from "@/components/ui/card";

interface AiStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}

export function AiStatsCard({ title, value, subtitle, icon }: AiStatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="h-8 w-8 text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
