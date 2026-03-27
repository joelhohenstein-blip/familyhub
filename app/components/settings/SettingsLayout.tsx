// File: app/components/settings/SettingsLayout.tsx (144 lines, 7021 bytes)

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card } from "../../components/ui/card";
import { VideoCallsSection } from "./VideoCallsSection";
import { FamilyManagementSection } from "./FamilyManagementSection";
import { WeatherI18nSection } from "./WeatherI18nSection";
import { MediaGallerySection } from "./MediaGallerySection";
import { StreamingTheaterSection } from "./StreamingTheaterSection";
import { AccountSettingsSection } from "./AccountSettingsSection";
import { NotificationSettingsSection } from "./NotificationSettingsSection";
import { PrivacySecuritySection } from "./PrivacySecuritySection";
import { BlurPreferencesPanel } from "./BlurPreferencesPanel";
import {
  Video,
  Users,
  Cloud,
  Image,
  Film,
  User,
  Bell,
  Lock,
  Eye,
} from "lucide-react";

export function SettingsLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage your FamilyHub preferences and settings</p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8 bg-white border-slate-200 shadow-sm">
                <div className="p-4">
                  <TabsList className="w-full flex flex-col h-auto bg-transparent border-0 p-0">
                    <TabsTrigger
                      value="account"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Account
                    </TabsTrigger>
                    <TabsTrigger
                      value="notifications"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger
                      value="privacy"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Privacy & Security
                    </TabsTrigger>
                    <TabsTrigger
                      value="video-calls"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video Calls
                    </TabsTrigger>
                    <TabsTrigger
                      value="family"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Family Management
                    </TabsTrigger>
                    <TabsTrigger
                      value="weather"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      Weather & i18n
                    </TabsTrigger>
                    <TabsTrigger
                      value="media"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Media Gallery
                    </TabsTrigger>
                    <TabsTrigger
                      value="streaming"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Film className="w-4 h-4 mr-2" />
                      Streaming Theater
                    </TabsTrigger>
                    <TabsTrigger
                      value="blur"
                      className="w-full justify-start text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Blur Preferences
                    </TabsTrigger>
                  </TabsList>
                </div>
              </Card>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              <TabsContent value="account" className="space-y-4">
                <AccountSettingsSection />
              </TabsContent>
              <TabsContent value="notifications" className="space-y-4">
                <NotificationSettingsSection />
              </TabsContent>
              <TabsContent value="privacy" className="space-y-4">
                <PrivacySecuritySection />
              </TabsContent>
              <TabsContent value="video-calls" className="space-y-4">
                <VideoCallsSection />
              </TabsContent>
              <TabsContent value="family" className="space-y-4">
                <FamilyManagementSection />
              </TabsContent>
              <TabsContent value="weather" className="space-y-4">
                <WeatherI18nSection />
              </TabsContent>
              <TabsContent value="media" className="space-y-4">
                <MediaGallerySection />
              </TabsContent>
              <TabsContent value="streaming" className="space-y-4">
                <StreamingTheaterSection />
              </TabsContent>
              <TabsContent value="blur" className="space-y-4">
                <BlurPreferencesPanel />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

