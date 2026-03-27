import { Settings as SettingsIcon, Bell, Lock, LayoutGrid, Database } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";

export function Settings() {
  const [activeTab, setActiveTab] = useState("Display Theme");
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";

  const tabs = [
    { name: "General", icon: SettingsIcon },
    { name: "Notifications", icon: Bell },
    { name: "Security", icon: Lock },
    { name: "Display Theme", icon: LayoutGrid },
    { name: "System", icon: Database },
  ];

  const toggleDarkMode = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${
                      isActive
                        ? "bg-cyan-100 text-cyan-500"
                        : "text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-cyan-500" : "text-gray-900"}`} strokeWidth={2.5} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          {activeTab === "Display Theme" ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
                <h2 className="text-xl font-bold text-gray-900">Display Settings</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between p-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 text-sm">Dark Mode</p>
                    <p className="text-xs text-gray-500">
                      Background Color will be black
                    </p>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={toggleDarkMode}
                    className="data-[state=checked]:bg-gray-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mb-4">
                {(() => {
                  const Icon = tabs.find(t => t.name === activeTab)?.icon || SettingsIcon;
                  return <Icon className="w-8 h-8" />;
                })()}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{activeTab}</h3>
              <p className="text-gray-500 text-sm">Settings for {activeTab} are coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
