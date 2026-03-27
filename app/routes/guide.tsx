import { useState } from "react";
import {
  FileText,
  MessageSquare,
  Video,
  Image,
  Calendar,
  ShoppingCart,
  Settings,
  Users,
  Lock,
  Bell,
  Zap,
  Download,
  Search,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { ContactSupportModal } from "~/components/ContactSupportModal";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Zap,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Welcome to FamilyHub!
          </h3>
          <p className="text-gray-700 mb-4">
            FamilyHub is your private family space for staying connected across
            distances. Here's how to get started in 4 simple steps.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-amber-500 pl-4">
            <h4 className="font-bold text-amber-700 mb-1">Step 1: Sign Up</h4>
            <p className="text-gray-700">
              Create your account with your email address. You'll receive a
              verification email—click the link to confirm.
            </p>
          </div>

          <div className="border-l-4 border-rose-500 pl-4">
            <h4 className="font-bold text-rose-700 mb-1">
              Step 2: Create or Join a Family
            </h4>
            <p className="text-gray-700">
              <strong>Create a Family:</strong> Set your family's name (e.g.,
              "Smith Family") and add an optional family avatar. As the admin,
              you control the family.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Join a Family:</strong> If invited by a family admin,
              click the invitation link and join their family directly.
            </p>
          </div>

          <div className="border-l-4 border-teal-500 pl-4">
            <h4 className="font-bold text-teal-700 mb-1">
              Step 3: Customize Your Profile
            </h4>
            <p className="text-gray-700">
              Set your first and last name, upload a profile picture, and choose
              your language preference. All family members can see your profile.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-bold text-blue-700 mb-1">
              Step 4: Invite Family Members
            </h4>
            <p className="text-gray-700">
              Go to Members and share invitation links with relatives. They'll
              receive an email with a link to join your family. Once they join,
              you can assign their role (Member, Admin, or Guest).
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>💡 Tip:</strong> As a family admin, you control who can join
            and what they can access. Start with close family members for the
            best experience.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "messaging",
    title: "Messaging & Conversations",
    icon: MessageSquare,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Stay Connected with Threaded Conversations
          </h3>
          <p className="text-gray-700 mb-4">
            FamilyHub's messaging system is built for families. Send quick
            messages, reply to specific topics, and keep conversations organized.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📝 Send a Message
            </h4>
            <p className="text-gray-700">
              Click the Messages section from the dashboard. Type your message
              in the input box and press Enter. All family members will see it
              instantly.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🧵 Reply in Threads
            </h4>
            <p className="text-gray-700">
              Hover over any message and click "Reply" to start a threaded
              conversation. This keeps related discussion together instead of
              mixing with other topics.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              😊 Add Emoji Reactions
            </h4>
            <p className="text-gray-700">
              Click the emoji icon on any message to add reactions (👍, ❤️,
              😂, etc.). It's a quick way to show you're paying attention without
              sending a full message.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              👤 Private Messages (1-on-1 Chat)
            </h4>
            <p className="text-gray-700">
              Click on a family member's name or profile to start a private
              conversation. These are only visible to you and that person.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📌 Pin Important Messages (Admin)
            </h4>
            <p className="text-gray-700">
              As a family admin, you can pin important messages (like family
              announcements) so they stay at the top. Perfect for reminders about
              family events or rules.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📦 Archive Old Threads (Admin)
            </h4>
            <p className="text-gray-700">
              Keep conversations tidy by archiving old threads. They're still
              searchable but won't clutter your main conversation view.
            </p>
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm text-teal-800">
            <strong>💬 Real-time Magic:</strong> Messages appear instantly for
            all family members—no refreshing needed. You'll see typing indicators
            when someone is composing a message.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "video-calls",
    title: "Video Calls",
    icon: Video,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Face-to-Face Connections
          </h3>
          <p className="text-gray-700 mb-4">
            Connect with family members across the world with high-quality video
            and audio calls. No app download needed—calls happen right in your
            browser.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📞 Start a Video Call
            </h4>
            <p className="text-gray-700">
              Go to the Calls section and click "Start Call." Choose which family
              members to invite, and they'll receive a notification to join.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🎤 Call Controls
            </h4>
            <p className="text-gray-700">
              During a call, you can toggle your camera and microphone on/off,
              mute others (if you're the host), and end the call anytime.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📋 Call History
            </h4>
            <p className="text-gray-700">
              All your past calls are logged in the Calls section. Click any call
              to see who participated, when it happened, and even rejoin a
              scheduled call.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              ⚙️ Camera & Microphone Permissions
            </h4>
            <p className="text-gray-700">
              Your browser will ask for camera/microphone access when you join a
              call. Allow access for the best experience. You can change
              permissions in your browser settings anytime.
            </p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-sm text-rose-800">
            <strong>🎥 Pro Tip:</strong> For the best video quality, ensure you
            have good lighting and a stable internet connection. Test your camera
            before important family calls!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "media-gallery",
    title: "Media Gallery & Photos",
    icon: Image,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Preserve Family Memories
          </h3>
          <p className="text-gray-700 mb-4">
            Share photos and videos with your family. Every image is organized,
            tagged, and backed up securely. You can even digitize old family
            photos (premium feature).
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🖼️ Upload Photos & Videos
            </h4>
            <p className="text-gray-700">
              Click the Gallery section and press the upload button. Select
              multiple files at once from your device or drag & drop directly
              into the gallery.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🏷️ Smart Photo Tagging (AI)
            </h4>
            <p className="text-gray-700">
              FamilyHub automatically tags your photos with locations, dates, and
              people (if you're on a premium plan). Use tags to search and
              organize thousands of photos in seconds.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📅 Timeline View
            </h4>
            <p className="text-gray-700">
              View all family photos organized by date in a beautiful timeline.
              Perfect for reliving family history chronologically.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📸 Photo Digitization Service (Premium)
            </h4>
            <p className="text-gray-700">
              Have old slides, photo albums, or 8mm film? Use our digitization
              service to preserve them forever. Scan your photos or mail them to
              us, and we'll digitize, restore, and upload them to your gallery.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔐 Privacy Controls
            </h4>
            <p className="text-gray-700">
              Control who sees each photo. Mark photos as private (admins only),
              family-only, or public to all members. Sensitive family moments
              stay protected.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>💾 Storage Tip:</strong> All photos are automatically backed
            up to FamilyHub's secure servers. Your memories are safe—no matter
            what happens to your device.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "calendar",
    title: "Calendar & Events",
    icon: Calendar,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Never Miss Family Events
          </h3>
          <p className="text-gray-700 mb-4">
            Keep your family synchronized with a shared calendar. Create events,
            birthdays, anniversaries, and holidays. Get reminders so everyone
            stays in the loop.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📆 Create an Event
            </h4>
            <p className="text-gray-700">
              Click Events in the dashboard and select a date. Enter the event
              name, time, and description. Invite specific family members or make
              it visible to everyone.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🎂 Birthday & Anniversary Reminders
            </h4>
            <p className="text-gray-700">
              Add family members' birthdays and anniversaries to the calendar.
              Everyone gets a notification on the big day so you never forget to
              wish them well.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔔 Event Notifications
            </h4>
            <p className="text-gray-700">
              You'll receive reminders for upcoming events via app notification.
              Customize reminder timing in your settings (e.g., 1 day before, 1
              hour before).
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📱 Sync to Your Calendar (Coming Soon)
            </h4>
            <p className="text-gray-700">
              Sync FamilyHub events to Google Calendar, Apple Calendar, or
              Outlook to keep everything in one place.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🌍 Family Time Zone Support
            </h4>
            <p className="text-gray-700">
              Family members across different time zones? No problem. Events
              automatically display in each person's local time.
            </p>
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm text-teal-800">
            <strong>📅 Smart Scheduling:</strong> Use AI-powered event
            suggestions to recommend family gatherings based on everyone's
            availability (premium feature).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "shopping",
    title: "Shopping Lists",
    icon: ShoppingCart,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Coordinate Family Shopping
          </h3>
          <p className="text-gray-700 mb-4">
            Create shared shopping lists and coordinate who's buying what. Never
            buy duplicates again or forget that one item everyone needs.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🛒 Create a Shopping List
            </h4>
            <p className="text-gray-700">
              Go to Shopping Lists and click "New List." Name it (e.g., "Grocery
              Shopping" or "Birthday Party Supplies") and start adding items.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              ➕ Add Items to List
            </h4>
            <p className="text-gray-700">
              Type item names in the list. Optionally add quantities, categories
              (produce, dairy, household, etc.), and prices. Assign items to
              family members to coordinate who's buying what.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              ✅ Check Items Off
            </h4>
            <p className="text-gray-700">
              As you shop, click the checkbox next to each item to mark it bought.
              Everyone sees updates in real-time, so no one buys duplicates.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              👥 Share Lists with Family
            </h4>
            <p className="text-gray-700">
              All shopping lists are visible to your whole family by default.
              Invite specific members to contribute or set permissions in list
              settings.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              💰 Budget & Pricing (Optional)
            </h4>
            <p className="text-gray-700">
              Track estimated costs for items. FamilyHub sums up totals so you
              know the budget before you shop.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📱 Mobile Shopping
            </h4>
            <p className="text-gray-700">
              Access shopping lists on your phone while you're at the store.
              Check items off as you shop—perfect for a quick reference.
            </p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-sm text-rose-800">
            <strong>🛍️ Pro Tip:</strong> Use shopping lists for more than just
            groceries—plan family reunions, wedding items, holiday decorations,
            or moving house supplies.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "settings",
    title: "Settings & Preferences",
    icon: Settings,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Customize Your Experience
          </h3>
          <p className="text-gray-700 mb-4">
            Control your notifications, privacy settings, language, and account
            preferences. Make FamilyHub work the way you want.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🌐 Language Settings
            </h4>
            <p className="text-gray-700">
              FamilyHub supports multiple languages. Go to Settings and select
              your preferred language. The interface will update instantly.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔔 Notification Preferences
            </h4>
            <p className="text-gray-700">
              Control what notifications you receive: messages, video calls,
              calendar events, birthday reminders, etc. Choose email, in-app, or
              both.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔐 Privacy & Account
            </h4>
            <p className="text-gray-700">
              Update your profile, change your password, manage connected devices,
              and control data privacy. You're in charge of your information.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📱 Device Management
            </h4>
            <p className="text-gray-700">
              See all devices logged into your account. Sign out of devices you
              no longer use for security.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🎨 Appearance (Coming Soon)
            </h4>
            <p className="text-gray-700">
              Choose light mode or dark mode. Future updates will include more
              customization options for your interface.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              💳 Billing
            </h4>
            <p className="text-gray-700">
              View your subscription plan, update payment methods, download
              invoices, and manage your account billing. Family admins have
              access to billing settings.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>⚙️ Quick Settings Access:</strong> Find Settings in the left
            sidebar of your dashboard. Changes apply immediately.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "admin",
    title: "Admin & Moderation",
    icon: Users,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Manage Your Family (Admin Only)
          </h3>
          <p className="text-gray-700 mb-4">
            As a family admin, you have special powers to invite members, manage
            roles, moderate content, and keep your family space safe and
            organized.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              👥 Manage Family Members
            </h4>
            <p className="text-gray-700">
              Go to Members and see all family members. Invite new members by
              sharing an invitation link. Assign roles: Admin (full control),
              Member (normal access), or Guest (read-only).
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📧 Invite Members
            </h4>
            <p className="text-gray-700">
              Click "Invite Member" to generate a shareable invitation link. Send
              it via email, text, or messenger. Family members click the link to
              join your family instantly.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🗑️ Remove Members
            </h4>
            <p className="text-gray-700">
              If a member leaves or you need to remove them, click the "Remove"
              button next to their name. They'll no longer have access to your
              family's space.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔎 Moderate Content
            </h4>
            <p className="text-gray-700">
              Access the Moderation panel to review messages and media for
              inappropriate content. Flag, delete, or archive messages as needed.
              All actions are logged.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📌 Pin Important Messages
            </h4>
            <p className="text-gray-700">
              Pin messages about family rules, important dates, or announcements
              to keep them at the top for everyone to see.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📦 Archive Old Threads
            </h4>
            <p className="text-gray-700">
              Keep conversations organized by archiving old or resolved threads.
              They're still searchable, just not visible by default.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              💳 Manage Billing
            </h4>
            <p className="text-gray-700">
              As admin, you control the family's subscription plan. Upgrade to
              Pro or Enterprise to unlock premium features for everyone.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📸 Photo Digitization Admin
            </h4>
            <p className="text-gray-700">
              Manage photo digitization jobs, track status, and handle customer
              communication. Update job timelines and handle payments through the
              admin dashboard.
            </p>
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm text-teal-800">
            <strong>⚠️ Admin Responsibility:</strong> With great power comes
            great responsibility. Use moderation tools fairly and transparently.
            Explain rules to your family and enforce them consistently.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    icon: Lock,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Your Family's Data is Safe
          </h3>
          <p className="text-gray-700 mb-4">
            FamilyHub takes privacy seriously. Your family photos, messages, and
            personal data are encrypted and protected.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔐 Encryption & Data Protection
            </h4>
            <p className="text-gray-700">
              All messages, photos, and videos are encrypted in transit and at
              rest. Only family members you authorize can see your data. We never
              share your information with third parties.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔒 Role-Based Access Control
            </h4>
            <p className="text-gray-700">
              Different family members have different access levels:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
              <li>
                <strong>Admin:</strong> Full control of family, all features
              </li>
              <li>
                <strong>Member:</strong> Full access to family content and
                messaging
              </li>
              <li>
                <strong>Guest:</strong> Read-only access (view messages, photos,
                calendar)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🚪 Secure Login & Sessions
            </h4>
            <p className="text-gray-700">
              Log in with your email and password (or via Google/GitHub). Your
              session is secure, and we automatically log you out after inactivity
              on shared devices.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔑 Password Best Practices
            </h4>
            <p className="text-gray-700">
              Use a strong, unique password for FamilyHub. Don't share your
              password with anyone. Change it regularly via Settings → Security.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📱 Two-Factor Authentication (Coming Soon)
            </h4>
            <p className="text-gray-700">
              We're adding two-factor authentication (2FA) soon for extra
              security. You'll receive a code on your phone when logging in from
              a new device.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🗑️ Delete Your Account
            </h4>
            <p className="text-gray-700">
              You can delete your account anytime from Settings → Account. All
              your personal data will be removed (your family's shared data may
              remain with your family).
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📋 Privacy Policy
            </h4>
            <p className="text-gray-700">
              Read our full privacy policy to learn exactly what data we collect
              and how we use it. It's at the bottom of every page.
            </p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-sm text-rose-800">
            <strong>🛡️ Your Privacy Matters:</strong> FamilyHub is built with
            privacy-first principles. We're transparent about data usage and
            comply with GDPR, CCPA, and other privacy regulations.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "notifications",
    title: "Notifications & Alerts",
    icon: Bell,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3 text-rose-600">
            Stay in the Loop
          </h3>
          <p className="text-gray-700 mb-4">
            Get real-time notifications for important family events so you never
            miss a message, call, or important announcement.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              💬 Message Notifications
            </h4>
            <p className="text-gray-700">
              Get notified when family members send you messages or reply to your
              threads. Customize: receive all notifications, just @mentions, or
              quiet hours.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📞 Video Call Invitations
            </h4>
            <p className="text-gray-700">
              You'll get a notification when someone invites you to a video call.
              Click to join instantly, or decline if you're busy.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🎂 Birthday & Anniversary Reminders
            </h4>
            <p className="text-gray-700">
              FamilyHub reminds you on the day of (or a few days before) family
              members' birthdays and anniversaries so you can send wishes.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📆 Upcoming Events
            </h4>
            <p className="text-gray-700">
              Get reminders for family calendar events (family dinners, reunions,
              holidays). Set reminder timing in your settings.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔔 Notification Preferences
            </h4>
            <p className="text-gray-700">
              Go to Settings → Notifications to choose:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
              <li>Notification type (messages, calls, events, etc.)</li>
              <li>Delivery method (in-app, email, both)</li>
              <li>Quiet hours (no notifications between specific times)</li>
              <li>Do Not Disturb for shared devices</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              🔕 Snooze Notifications
            </h4>
            <p className="text-gray-700">
              Need a break? Snooze notifications for 1 hour, 4 hours, or until
              tomorrow. You can always re-enable them in Settings.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">
              📱 Browser vs. Email
            </h4>
            <p className="text-gray-700">
              FamilyHub sends in-app notifications while you're using the app and
              email notifications when you're away. You can customize both.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>🔔 Finding Notifications:</strong> Check your notification
            bell icon (🔔) in the top navigation bar. Click it to see all recent
            notifications and mark them as read.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "faq",
    title: "Frequently Asked Questions",
    icon: FileText,
    content: (
      <div className="space-y-4">
        <div className="border-l-4 border-rose-500 pl-4">
          <h4 className="font-bold text-rose-700 mb-2">
            Can I be in multiple families?
          </h4>
          <p className="text-gray-700">
            Yes! You can join multiple families. For example, you might be in
            your nuclear family AND your extended cousins group. Switch between
            families in the sidebar.
          </p>
        </div>

        <div className="border-l-4 border-amber-500 pl-4">
          <h4 className="font-bold text-amber-700 mb-2">
            What if I forget my password?
          </h4>
          <p className="text-gray-700">
            Click "Forgot Password?" on the login page. You'll receive an email
            with a secure link to reset your password in 10 minutes.
          </p>
        </div>

        <div className="border-l-4 border-teal-500 pl-4">
          <h4 className="font-bold text-teal-700 mb-2">
            How do I delete messages?
          </h4>
          <p className="text-gray-700">
            Hover over any message and click the three dots (...) menu. Select
            "Delete." Only admins can delete other people's messages.
          </p>
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-bold text-blue-700 mb-2">
            Can I download my family photos?
          </h4>
          <p className="text-gray-700">
            Yes! Go to Gallery, select photos, and click "Download." They'll be
            saved to your device as a ZIP file.
          </p>
        </div>

        <div className="border-l-4 border-rose-500 pl-4">
          <h4 className="font-bold text-rose-700 mb-2">
            What's included in the Free plan?
          </h4>
          <p className="text-gray-700">
            Free plan includes: messaging, video calls, media gallery, calendar,
            shopping lists, and member management. Premium plans unlock AI
            features, advanced privacy, and digitization services.
          </p>
        </div>

        <div className="border-l-4 border-amber-500 pl-4">
          <h4 className="font-bold text-amber-700 mb-2">
            How much does photo digitization cost?
          </h4>
          <p className="text-gray-700">
            Pricing depends on quantity and format. Submit an inquiry form to get
            a quote. Premium plans get discounts.
          </p>
        </div>

        <div className="border-l-4 border-teal-500 pl-4">
          <h4 className="font-bold text-teal-700 mb-2">
            Is FamilyHub available on mobile?
          </h4>
          <p className="text-gray-700">
            FamilyHub is fully responsive on mobile devices. Access it from any
            browser on your phone, tablet, or computer. A native mobile app is
            coming soon.
          </p>
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-bold text-blue-700 mb-2">
            Can I change my family name?
          </h4>
          <p className="text-gray-700">
            Yes! Family admins can update the family surname in Family Settings.
            This doesn't affect individual member names.
          </p>
        </div>

        <div className="border-l-4 border-rose-500 pl-4">
          <h4 className="font-bold text-rose-700 mb-2">
            What if I need help or have a bug to report?
          </h4>
          <p className="text-gray-700">
            Contact our support team via the help icon at the bottom right of
            the app. We're here to help!
          </p>
        </div>

        <div className="border-l-4 border-amber-500 pl-4">
          <h4 className="font-bold text-amber-700 mb-2">
            Can I export all my family data?
          </h4>
          <p className="text-gray-700">
            Yes! Go to Settings → Data & Privacy → "Export My Data." You'll
            receive a ZIP file with all your messages, photos, and metadata.
          </p>
        </div>
      </div>
    ),
  },
];

export default function GuidePage() {
  const [selectedSection, setSelectedSection] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSection = sections.find((s) => s.id === selectedSection);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            FamilyHub User Guide
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Learn how to use FamilyHub to stay connected with your family,
            share memories, and plan together.
          </p>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 flex-wrap">
            <Button className="bg-rose-600 hover:bg-rose-700">
              <Download size={18} className="mr-2" />
              Download as PDF
            </Button>
            <Button variant="outline" onClick={() => setContactModalOpen(true)}>
              Contact Support
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-white rounded-lg shadow-sm p-4 border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Topics</h2>
              <nav className="space-y-2">
                {filteredSections.length === 0 ? (
                  <p className="text-sm text-slate-500">No topics match</p>
                ) : (
                  filteredSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSection(section.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                          selectedSection === section.id
                            ? "bg-rose-100 text-rose-700 font-semibold border-l-4 border-rose-600"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon size={18} />
                        <span>{section.title}</span>
                      </button>
                    );
                  })
                )}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentSection && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  {currentSection.icon && (
                    <currentSection.icon
                      size={32}
                      className="text-rose-600"
                    />
                  )}
                  <h2 className="text-3xl font-bold text-slate-900">
                    {currentSection.title}
                  </h2>
                </div>

                <div className="prose prose-slate max-w-none">
                  {currentSection.content}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-4 mt-12 pt-8 border-t border-slate-200">
                  {sections.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const currentIndex = sections.findIndex(
                            (s) => s.id === selectedSection
                          );
                          if (currentIndex > 0) {
                            setSelectedSection(
                              sections[currentIndex - 1].id
                            );
                          }
                        }}
                        disabled={
                          sections.findIndex(
                            (s) => s.id === selectedSection
                          ) === 0
                        }
                      >
                        ← Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const currentIndex = sections.findIndex(
                            (s) => s.id === selectedSection
                          );
                          if (
                            currentIndex <
                            sections.length - 1
                          ) {
                            setSelectedSection(
                              sections[currentIndex + 1].id
                            );
                          }
                        }}
                        disabled={
                          sections.findIndex(
                            (s) => s.id === selectedSection
                          ) ===
                          sections.length - 1
                        }
                      >
                        Next →
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 mt-16 py-8 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-300">
            © 2026 FamilyHub. All rights reserved.
          </p>
        </div>
      </footer>

      <ContactSupportModal 
        open={contactModalOpen} 
        onOpenChange={setContactModalOpen} 
      />
    </div>
  );
}
