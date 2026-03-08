

## FitSquad — Birds of Prey Edition 🎪💪

A mobile-first fitness challenge app for a tight group of 3-5 friends, with a bold neon comic-style UI inspired by Birds of Prey.

### Design System
- **Colors**: Neon pink (#FF2D87), electric teal (#00F5D4), hot yellow (#FFE600), electric blue (#5271FF) on white/light backgrounds
- **Typography**: Bold, chunky headings; playful rounded body text
- **Cards**: Comic-panel style with thick borders, slight rotation, drop shadows
- **Accents**: Sticker-like badges, crown icons, confetti bursts, neon gradient buttons
- **Mobile-first**: Bottom tab navigation, swipeable cards

### Backend (Lovable Cloud / Supabase)
- **Auth**: Email/password signup & login
- **Tables**: profiles, workouts, workout_entries (weight, completed), weekly_scores, rewards, user_roles
- **RLS**: Users see group data, only edit their own entries; admin (plan creator) manages weekly plans

### Pages & Navigation (Bottom Tabs)

**1. Leaderboard Tab** 🏆
- Ranked list of friends with points, streaks, and crown for #1
- Weekly winner highlighted with confetti animation & winner badge
- Streak fire icons 🔥
- Monthly reset indicator

**2. Current Week Tab** 💪
- "Starting Song of the Week" card at top (if set by winner)
- Mini-challenge progress bar (if set by winner)
- List of daily workouts for the week (set by one designated person)
- Each workout expandable: enter weight, mark complete, see suggested weight
- Confetti animation on workout completion
- Auto-calculate next week's suggested weight (+2.5% progression)

**3. Rewards Tab** 🎁
- Shows current week number (1-4 cycle)
- Displays active weekly power and who chose it
- If user is the winner: form to select/set the reward
  - Week 1: Pick a starting song (text input)
  - Week 2: Assign a mini-challenge (text input)
  - Week 3: Choose recovery ritual (text input)
  - Week 4: Fancy dinner celebration unlock status
- History of past rewards

**4. Profile Tab** 👤
- Avatar, name, stats (total workouts, best streak, weeks won)
- Logout button
- Settings

### Key Flows
- **Winner flow**: Login → Leaderboard shows crown → Rewards tab unlocks power selection → Choose reward → Group sees it
- **Member flow**: Login → See leaderboard → See active reward on Current Week → Complete workouts → Earn points

### Gamification
- Points: +10 per completed workout, +5 streak bonus per consecutive day
- Streaks tracked with fire icons
- #1 position triggers celebration confetti
- Monthly leaderboard reset with recap

### Auth Pages
- Login & Signup with neon gradient styling
- Profile creation (name, avatar color)

