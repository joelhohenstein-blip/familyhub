# FamilyHub Live Test Walkthrough

## ✅ Phase 1: Home Page & Landing
- Clean, warm design with orange/rose/teal gradient
- 4 feature cards: Message Board, Video & Audio, Media Library, Movie Theater
- Language selector (top right)
- Sign Up / Sign In buttons
- Terms & Privacy links

## ✅ Phase 2: Authentication
- **Signup Page**: Email, password fields, social auth (GitHub/Google)
- **Login Page**: Email, password, "Forgot password", social auth options

## 📋 Phase 3: Onboarding (After First Login)
The app follows a 4-step onboarding flow:
1. **Create Family** - Set family surname (e.g., "Smith")
2. **Add Avatar** - Upload family photo/avatar
3. **Invite Members** - Invite family members via email
4. **Set Roles** - Assign admin/member roles

After onboarding, users see the **branded dashboard** showing:
`{Surname} FamilyHub Dashboard` (e.g., "Smith FamilyHub Dashboard")

## 🎯 Phase 4: Core Features (Dashboard)
- **Message Board**: Post messages, nested replies, emoji reactions
- **Media Gallery**: Upload photos/videos, smart tagging
- **Calendar**: Shared family events
- **Shopping Lists**: Collaborative shopping with categories
- **Video Calls**: Jitsi integration for 1-on-1 and group calls
- **Streaming Theater**: Free streaming content (Pluto, Tubi, Roku, Freeview)
- **Family Timeline**: Photo timeline and highlights

## ⚙️ Phase 5: Admin & Settings
- **Family Member Management**: Add/remove/edit members
- **Admin Controls**: Moderation, content management
- **Settings**: User preferences, privacy controls
- **Internationalization**: Language selection

## 🎨 Rebranding (NEW)
- Logo shows: `[Monogram] {Surname} FamilyHub`
- Page titles show: `{Surname} FamilyHub {PageName}`
- Example: "Smith FamilyHub Dashboard", "Johnson FamilyHub Admin"
EOF
cat test_walkthrough.md
