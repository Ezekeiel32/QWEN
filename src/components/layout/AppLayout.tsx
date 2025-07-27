"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
 PanelLeft, Home, Cpu, Zap, Atom, BarChart3, PlayCircle, Lightbulb, 
  Replace, Cog, Scaling, Box, Share2, Wrench, Moon, Sun, BrainCircuit, Globe, 
  ScatterChart, IterationCw, MessageSquare, Signal, SlidersHorizontal, Monitor, TrendingUp, Wand2, Rocket, ArrowRight, Settings2, ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar, 
} from "@/components/ui/sidebar";
import FloatingMiniAdvisor from "@/components/FloatingMiniAdvisor";
import { AdvisorProvider } from "@/components/mini-hs-qnn-advisor";

const mainNavItems = [
  { href: "/introduction", label: "Introduction", icon: ArrowRight },
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/data-portal", label: "Data Portal", icon: Globe },
  { href: "/train", label: "Train Model", icon: PlayCircle },
  { href: "/my-zpe-ai-models", label: "My ZPE-AI Models", icon: ListChecks },
  { href: "/performance", label: "Performance Analysis", icon: TrendingUp },
  // { href: "/architecture", label: "Architecture", icon: Cpu }, // Removed
  { href: "/gpu-monitor", label: "GPU Monitor", icon: Monitor },
];

const advancedToolsNavItems = [
  { href: "/zpe-flow-analysis", label: "ZPE Flow Analysis", icon: SlidersHorizontal },
  { href: "/zpe-flow", label: "HS-QNN Advisor", icon: BrainCircuit },
  { href: "/quantum-noise", label: "Quantum Noise", icon: Atom },
  { href: "/rf-generator", label: "RF Generator", icon: Signal },
  { href: "/ai-analysis", label: "AI Assistant", icon: MessageSquare },
  { href: "/cloud-gpu", label: "Cloud GPU Connect", icon: Settings2 },
];

const visNavItems = [
  { href: "/vis/bloch-sphere", label: "Bloch Sphere", icon: Globe },
  { href: "/vis/dynamic-formation", label: "Dynamic Formation", icon: IterationCw },
  { href: "/vis/zpe-particle-simulation", label: "ZPE Particle Sim", icon: ScatterChart },
];

const aiFlowsNavItems = [
  { href: "/ai", label: "AI Flows Hub", icon: Rocket },
  { href: "/ai/implement-zpe", label: "Simulate ZPE", icon: Lightbulb },
  { href: "/ai/approximate-zpe", label: "Approximate Flow", icon: Replace },
  { href: "/ai/adapt-zpe", label: "Adapt ZPE", icon: Cog },
  { href: "/ai/show-scaled-output", label: "Scaled Output", icon: Scaling },
  { href: "/ai/quantize-model", label: "Quantize Model", icon: Box },
  { href: "/ai/extract-components", label: "Extract Components", icon: Share2 },
  { href: "/ai/configure-model", label: "Configure Model", icon: Wrench },
  { href: "/ai/invoke-llm", label: "Generic LLM", icon: Wand2 },
];

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NavLinkWrapper = ({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick: () => void;
}) => {
  const Icon = item.icon;
  const isActive =
    (pathname === item.href ||
      (pathname.startsWith(item.href + "/") &&
        item.href !== "/dashboard" &&
        item.href !== "/" &&
        item.href !== "/ai")) ||
    (pathname === "/" && item.href === "/introduction") ||
    (pathname === "/ai" && item.href === "/ai");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={{ children: item.label, side: "right", align: "center" }}
        className="justify-start"
        onClick={onClick}
      >
        <Link href={item.href}>
          <Icon className="h-5 w-5" />
          <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const AppSidebarContent = () => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar(); 
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDarkMode(storedTheme === "dark");
    } else {
      setIsDarkMode(window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const renderNavSection = (title: string, items: NavItem[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavLinkWrapper
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={handleLinkClick}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-primary" onClick={handleLinkClick}>
          <Zap className="h-7 w-7" />
          <span className="group-data-[state=collapsed]:hidden">Quantum Weaver</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto p-0">
        <ScrollArea className="h-full px-2 py-0">
          {renderNavSection("Main", mainNavItems)}
          {renderNavSection("Advanced Tools", advancedToolsNavItems)}
          {renderNavSection("Visualizations", visNavItems)}
          {renderNavSection("AI Flows", aiFlowsNavItems)}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
          <SidebarMenuButton variant="outline" onClick={toggleDarkMode} className="w-full justify-start text-sm">
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="group-data-[state=collapsed]:hidden">
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDarkMode(storedTheme === "dark");
    } else {
      setIsDarkMode(window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true);
    }
  }, []);
  
  useEffect(() => {
    if (isDarkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
  }, [isDarkMode]);

  return (
    <SidebarProvider>
      <AdvisorProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar className="z-40">
              <AppSidebarContent />
            </Sidebar>
          <main className="flex-1 min-h-screen bg-black/95 relative">
              {children}
            {/* FloatingMiniAdvisor overlays all pages */}
          <FloatingMiniAdvisor
            onApplyParameters={() => {}}
            onSaveConfig={() => {}}
              defaultMinimized={false}
          />
          </main>
        </div>
      </AdvisorProvider>
    </SidebarProvider>
  );
}
