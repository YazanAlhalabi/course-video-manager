import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Archive,
  ChevronRight,
  ClipboardList,
  Eye,
  FolderGit2,
  Plus,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";

// --- Mock Data ---

const MOCK_COURSES = [
  { id: "1", name: "Total TypeScript Pro Essentials" },
  { id: "2", name: "React with TypeScript" },
];

const MOCK_ARCHIVED_COUNT = 4;

const MOCK_VIDEOS = [
  { id: "v1", path: "useEffect Deep Dive" },
  { id: "v2", path: "Zod Validation Patterns" },
  { id: "v3", path: "Type Narrowing Tips" },
  { id: "v4", path: "Generic Functions Guide" },
  { id: "v5", path: "Template Literal Types" },
];

const MOCK_PLANS = [
  { id: "p1", title: "Advanced Patterns Module" },
  { id: "p2", title: "Error Handling Series" },
];

// --- Layout 1: Classic Collapsible (current style) ---

function Layout1() {
  return (
    <div className="space-y-2">
      {/* Courses */}
      <Collapsible defaultOpen>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-lg font-semibold hover:text-foreground/80 transition-colors group">
            <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
            <FolderGit2 className="w-5 h-5" />
            Courses
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-6 mt-2 space-y-1">
            {MOCK_COURSES.map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start whitespace-normal text-left h-auto py-1.5"
              >
                {c.name}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
            >
              Archived Courses
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Videos */}
      <Collapsible defaultOpen>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-lg font-semibold hover:text-foreground/80 transition-colors group">
            <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
            <VideoIcon className="w-5 h-5" />
            Videos
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-6 mt-2 space-y-1">
            {MOCK_VIDEOS.map((v) => (
              <Button
                key={v.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start whitespace-normal text-left h-auto py-1.5"
              >
                {v.path}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
            >
              View All Videos
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Plans */}
      <Collapsible defaultOpen>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-lg font-semibold hover:text-foreground/80 transition-colors group">
            <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
            <ClipboardList className="w-5 h-5" />
            Plans
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-6 mt-2 space-y-1">
            {MOCK_PLANS.map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start whitespace-normal text-left h-auto py-1.5"
              >
                {p.title}
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// --- Layout 2: Card Sections with Counts ---

function Layout2() {
  return (
    <div className="space-y-3">
      {/* Courses Card */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Courses</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {MOCK_COURSES.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="space-y-0.5">
          {MOCK_COURSES.map((c) => (
            <button
              key={c.id}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
            >
              {c.name}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 px-2 transition-colors">
          <Archive className="w-3 h-3" />
          {MOCK_ARCHIVED_COUNT} archived
        </button>
      </div>

      {/* Videos Card */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Videos</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              5
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="space-y-0.5">
          {MOCK_VIDEOS.map((v) => (
            <button
              key={v.id}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
            >
              {v.path}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 px-2 transition-colors">
          <Eye className="w-3 h-3" />
          View all videos
        </button>
      </div>

      {/* Plans Card */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Plans</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {MOCK_PLANS.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="space-y-0.5">
          {MOCK_PLANS.map((p) => (
            <button
              key={p.id}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Layout 3: Tabbed Navigation ---

function Layout3() {
  return (
    <Tabs defaultValue="courses" className="h-full flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
        <TabsTrigger
          value="courses"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2"
        >
          <FolderGit2 className="w-4 h-4 mr-1.5" />
          Courses
        </TabsTrigger>
        <TabsTrigger
          value="videos"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2"
        >
          <VideoIcon className="w-4 h-4 mr-1.5" />
          Videos
        </TabsTrigger>
        <TabsTrigger
          value="plans"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2"
        >
          <ClipboardList className="w-4 h-4 mr-1.5" />
          Plans
        </TabsTrigger>
      </TabsList>

      <TabsContent value="courses" className="flex-1 mt-0 pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {MOCK_COURSES.length} courses
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Course
          </Button>
        </div>
        <div className="space-y-1">
          {MOCK_COURSES.map((c) => (
            <Button
              key={c.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-auto py-2"
            >
              <FolderGit2 className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              {c.name}
            </Button>
          ))}
        </div>
        <Separator className="my-3" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
        >
          <Archive className="w-4 h-4 mr-2" />
          Archived Courses ({MOCK_ARCHIVED_COUNT})
        </Button>
      </TabsContent>

      <TabsContent value="videos" className="flex-1 mt-0 pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Recent videos</span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Video
          </Button>
        </div>
        <div className="space-y-1">
          {MOCK_VIDEOS.map((v) => (
            <Button
              key={v.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-auto py-2"
            >
              <VideoIcon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              {v.path}
            </Button>
          ))}
        </div>
        <Separator className="my-3" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
        >
          <Eye className="w-4 h-4 mr-2" />
          View All Videos
        </Button>
      </TabsContent>

      <TabsContent value="plans" className="flex-1 mt-0 pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {MOCK_PLANS.length} plans
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Plan
          </Button>
        </div>
        <div className="space-y-1">
          {MOCK_PLANS.map((p) => (
            <Button
              key={p.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-auto py-2"
            >
              <ClipboardList className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              {p.title}
            </Button>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

// --- Layout 4: Flat List with Sticky Headers ---

function Layout4() {
  return (
    <div className="space-y-0">
      {/* Courses Section */}
      <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Courses
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="px-1 pb-1">
        {MOCK_COURSES.map((c) => (
          <button
            key={c.id}
            className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {c.name}
          </button>
        ))}
        <button className="w-full text-left text-xs px-2 py-1 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          <Archive className="w-3 h-3" />
          {MOCK_ARCHIVED_COUNT} archived courses
        </button>
      </div>

      <Separator />

      {/* Videos Section */}
      <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Videos
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="px-1 pb-1">
        {MOCK_VIDEOS.map((v) => (
          <button
            key={v.id}
            className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
          >
            <VideoIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {v.path}
          </button>
        ))}
        <button className="w-full text-left text-xs px-2 py-1 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          <Eye className="w-3 h-3" />
          View all videos
        </button>
      </div>

      <Separator />

      {/* Plans Section */}
      <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Plans
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="px-1 pb-1">
        {MOCK_PLANS.map((p) => (
          <button
            key={p.id}
            className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
          >
            <ClipboardList className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {p.title}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Layout 5: Icon Rail + Content Panel ---

function Layout5() {
  const [activeSection, setActiveSection] = useState<
    "courses" | "videos" | "plans"
  >("courses");

  const sections = {
    courses: {
      icon: FolderGit2,
      label: "Courses",
      items: MOCK_COURSES.map((c) => ({ id: c.id, label: c.name })),
      footer: (
        <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 transition-colors">
          <Archive className="w-3 h-3" />
          {MOCK_ARCHIVED_COUNT} archived
        </button>
      ),
    },
    videos: {
      icon: VideoIcon,
      label: "Videos",
      items: MOCK_VIDEOS.map((v) => ({ id: v.id, label: v.path })),
      footer: (
        <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 transition-colors">
          <Eye className="w-3 h-3" />
          View all videos
        </button>
      ),
    },
    plans: {
      icon: ClipboardList,
      label: "Plans",
      items: MOCK_PLANS.map((p) => ({ id: p.id, label: p.title })),
      footer: null,
    },
  } as const;

  const current = sections[activeSection];

  return (
    <div className="flex h-full">
      {/* Icon rail */}
      <div className="w-12 border-r flex flex-col items-center py-2 gap-1 bg-muted/50">
        {(Object.keys(sections) as Array<keyof typeof sections>).map((key) => {
          const section = sections[key];
          const Icon = section.icon;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    activeSection === key
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  onClick={() => setActiveSection(key)}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{section.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Content panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">{current.label}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {current.items.map((item) => (
              <button
                key={item.id}
                className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
          {current.footer && <div className="px-2 pb-2">{current.footer}</div>}
        </ScrollArea>
      </div>
    </div>
  );
}

// --- Main Prototype Page ---

const LAYOUTS = [
  {
    id: "1",
    name: "Classic Collapsible",
    description:
      "Current style — collapsible sections with chevron toggles. Familiar tree-view pattern.",
    component: Layout1,
  },
  {
    id: "2",
    name: "Card Sections",
    description:
      "Each section in its own bordered card with count badges. Clearer visual separation.",
    component: Layout2,
  },
  {
    id: "3",
    name: "Tabbed Navigation",
    description:
      "Tabs at top to switch between sections. Shows one section at a time — less scrolling.",
    component: Layout3,
  },
  {
    id: "4",
    name: "Flat List with Headers",
    description:
      "Compact, no collapsibles. Uppercase sticky headers with separators. IDE-inspired.",
    component: Layout4,
  },
  {
    id: "5",
    name: "Icon Rail + Panel",
    description:
      "Narrow icon column on left, content on right. VS Code-inspired. Most space-efficient.",
    component: Layout5,
  },
];

export default function PrototypeSidebarLayouts() {
  const [selected, setSelected] = useState("1");

  const current = LAYOUTS.find((l) => l.id === selected)!;
  const CurrentComponent = current.component;

  return (
    <div className="h-screen flex bg-background text-foreground">
      {/* Preview sidebar */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <CurrentComponent />
          </div>
        </div>
      </div>

      {/* Layout selector */}
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold mb-2">Sidebar Layout Prototypes</h1>
        <p className="text-muted-foreground mb-6">
          Select a layout to preview it in the sidebar on the left.
        </p>

        <div className="grid gap-4 max-w-2xl">
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              className={cn(
                "text-left border rounded-lg p-4 transition-colors",
                selected === layout.id
                  ? "border-foreground bg-accent"
                  : "border-border hover:border-foreground/50 hover:bg-accent/50"
              )}
              onClick={() => setSelected(layout.id)}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {layout.id}
                </span>
                <span className="font-medium">{layout.name}</span>
                {selected === layout.id && (
                  <Badge variant="secondary" className="text-[10px]">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {layout.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
