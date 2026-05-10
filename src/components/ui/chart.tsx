"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
    theme?: Record<keyof typeof THEMES, string>;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
};

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-slot="chart"
          data-chart={chartId}
          ref={ref}
          className={cn(
            "h-[240px] w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid-horizontal_line]:stroke-border/50 [&_.recharts-cartesian-grid-vertical_line]:stroke-border/50 [&_.recharts-layer]:outline-none",
            className,
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  },
);
ChartContainer.displayName = "ChartContainer";

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, item]) => item.color || item.theme,
  );

  if (!colorConfig.length) {
    return null;
  }

  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const declarations = colorConfig
        .map(([key, item]) => {
          const color =
            item.theme?.[theme as keyof typeof THEMES] ?? item.color;

          if (!color) {
            return null;
          }

          return `  --color-${key}: ${color};`;
        })
        .filter(Boolean)
        .join("\n");

      if (!declarations) {
        return "";
      }

      return `${prefix} [data-chart='${id}'] {\n${declarations}\n}`;
    })
    .filter(Boolean)
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
};

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  className?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  labelFormatter?: (
    label: string | number,
    payload: TooltipPayloadItem[],
  ) => React.ReactNode;
  formatter?: (
    value: number | string,
    name: string,
    item: TooltipPayloadItem,
    index: number,
    payload: TooltipPayloadItem[],
  ) => React.ReactNode;
  indicator?: "dot" | "line";
};

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      className,
      hideLabel = false,
      hideIndicator = false,
      labelFormatter,
      formatter,
      indicator = "dot",
    },
    ref,
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    const tooltipLabel = hideLabel
      ? null
      : labelFormatter
        ? labelFormatter(label ?? "", payload)
        : label;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[9rem] items-start gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl",
          className,
        )}
      >
        {tooltipLabel ? (
          <p className="font-medium text-foreground">{tooltipLabel}</p>
        ) : null}
        <div className="grid gap-1">
          {payload.map((item, index) => {
            const key = String(item.dataKey ?? item.name ?? index);
            const itemConfig = config[key];
            const itemName =
              itemConfig?.label ?? String(item.name ?? item.dataKey ?? key);
            const itemColor = item.color ?? `var(--color-${key})`;

            return (
              <div key={`${key}-${index}`} className="flex items-center gap-2">
                {!hideIndicator ? (
                  indicator === "line" ? (
                    <span
                      className="h-0.5 w-3 rounded-full"
                      style={{ backgroundColor: itemColor }}
                    />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: itemColor }}
                    />
                  )
                ) : null}
                <span className="text-muted-foreground">{itemName}</span>
                <span className="ml-auto font-medium text-foreground">
                  {formatter
                    ? formatter(item.value ?? 0, key, item, index, payload)
                    : item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
