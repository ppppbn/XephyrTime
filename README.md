# XephyrTime

A single-page web application that lets you log time entries to Clockify using natural language commands, with support for both text and voice input.

## Features

- 🎤 **Voice Commands**: Record voice commands and automatically transcribe them using OpenAI Whisper
- 📝 **Text Commands**: Type natural language commands to create time entries
- 🤖 **Smart Parsing**: Uses GPT-4o-mini to parse complex commands and handle recurring entries
- ⏰ **Recurring Entries**: Supports commands like "Log standup every workday this week"
- 🕐 **Smart Defaults**: Auto-rounds to 15-min intervals, defaults to current time and current week
- 📋 **Task Intelligence**: Automatically identifies and assigns tasks within projects
- 🔐 **Secure**: API tokens stored locally, no server component
- ✅ **Validation**: Checks for overlapping entries and missing projects
- 🌐 **Modern UI**: Beautiful, responsive design with TailwindCSS
- ⌨️ **Space Shortcut**: Hold Space key to quickly record voice commands

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your OpenAI API key to the `.env` file:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

### 3. Get Your Clockify API Token

1. Go to Clockify: https://clockify.me/
2. Navigate to Profile Settings → API
3. Generate a new API key
4. Copy the token (you'll enter this in the app)

### 4. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

### Setting Up Your Token

1. When you first open the app, you'll see a red banner indicating no API token is set
2. Click "Set Token" and paste your Clockify API token
3. The banner will turn green when the token is validated

### Text Commands

Type natural language commands in the text area:

**Simple Examples (with smart defaults):**
- "Log 2 hours coding" → Starts from current time (rounded to 15-min), duration 2h
- "Log 1 hour meeting" → Starts now, ends in 1 hour
- "Log 30 minutes email processing to Project Alpha" → Starts now with project

**Task Assignment Examples:**
- "Log 2 hours development to Project Alpha" → Automatically assigns to "Development" task if it exists
- "Log 30 minutes standup to BETA project" → Matches to "Daily Standup" or similar task
- "Log bug fix session to Mobile App" → Assigns to "Bug Fixes" or "Development" task

**Specific Time Examples:**
- "Log 2 hours coding to Project Alpha starting now"
- "Yesterday 3pm to 5pm working on bug fixes for BETA project"
- "Log 30 minutes of team meeting today 2-2:30pm"

**Current Week Examples (fixed "this week" behavior):**
- "Log meeting Monday this week" → Uses Monday of the current week (containing today)
- "Log 15 minutes standup every workday this week at 9am" → Mon-Fri of current week
- "Tuesday this week 2pm client call" → Uses Tuesday of current week

**Recurring Examples:**
- "Log 15 minutes of standup every workday this week from 9 to 9:15 am"
- "Log 1 hour of email every Monday and Friday this month at 8am"

### Voice Commands

**Click Method:**
1. Click the microphone button to start recording
2. Speak your command clearly
3. Click the microphone again to stop recording
4. The transcript will appear in the text area
5. Click "Parse Command" to process it

**Space Key Shortcut:**
1. Hold Space key anywhere (outside text input) to start recording
2. Speak your command while holding Space
3. Release Space key to stop recording and process
4. Voice commands are transcribed automatically

### Smart Task Assignment

XephyrTime intelligently assigns tasks to your time entries:

1. **Explicit Task Names**: If you mention a task that exists in the project, it's assigned automatically
   - "Log development task to Project Alpha" → Assigns "Development" task

2. **Smart Guessing**: Based on activity description, the AI guesses the most appropriate task
   - "Log meeting" → Might assign "Daily Standup" or "Meetings" task
   - "Log bug fix" → Might assign "Bug Fixes" or "Development" task
   - "Log research" → Might assign "Research" or "Analysis" task

3. **Fallback**: If no appropriate task can be determined, the entry is created without a task

### Smart Project Assignment

XephyrTime can identify projects in multiple ways:

1. **Direct Project Name**: Use the exact project name
   - "Log 2 hours to Project Alpha" → Assigns to "Project Alpha"

2. **Client-Based Matching**: Mention the client name when you don't know the exact project
   - "Log 2 hours to XWAT" → If XWAT is a client, assigns to the project(s) under XWAT
   - "Log development time to ACME" → Finds the project associated with ACME client

3. **Intelligent Context**: The AI considers both project and client information to make the best match

**Example Scenarios:**
- Your Clockify has: Client "XWAT" with Project "XMAP"
- Command: "Log 3 hours to XWAT" → Automatically assigns to "XMAP" project
- Command: "Log meeting with ACME client" → Finds project under ACME client

### Smart Defaults

The app includes intelligent defaults:

1. **Time Rounding**: All times are automatically rounded to 15-minute intervals (9:00, 9:15, 9:30, 9:45)
2. **Default Start Time**: Commands without specific times start from the current moment (rounded)
3. **Week Interpretation**: "This week" always means the week containing today, regardless of what day it is
4. **Default Duration**: If only duration is specified, it starts from current time
5. **Task Capitalization**: All task descriptions are automatically capitalized

### Submitting Entries

1. After parsing a command, you'll see a preview of the time entries
2. Review the entries for accuracy, including assigned tasks
3. Check for any warnings (overlapping times, missing projects)
4. Click "Submit to Clockify" to log the entries
5. Success notifications show detailed information: "✅ Successfully logged 3 entries (5.5h total) across 2 projects"

## Command Examples

### Basic Time Logging (New Smart Defaults)
```
Log 3 hours development work
→ Starts from current time, duration 3 hours, rounded to 15-min intervals
```

### Task Assignment Examples
```
Log standup to Project Alpha
→ Automatically assigns to "Daily Standup" task if available

Log 2 hours bug fixing to Mobile App
→ Assigns to "Bug Fixes" or "Development" task based on available options
```

### Client-Based Project Assignment Examples
```
Log 3 hours to XWAT
→ If XWAT is a client, automatically assigns to the project under XWAT client

Log development meeting with ACME yesterday 2pm
→ Finds the project associated with ACME client and assigns appropriate meeting task
```

### Current Week (Fixed Behavior)
```
Log meeting Monday this week
→ Uses Monday of the week containing today (not next week)
```

### Specific Date and Time
```
Yesterday from 2pm to 4pm worked on bug fixes for the Mobile App project
```

### Recurring Entries
```
Log 30 minutes of standup every workday this week from 9:30 to 10:00 am
```

### Multiple Projects
```
Log 2 hours to Project A and 1 hour to Project B today starting at 9am
```

## Troubleshooting

### "Invalid API token" Error
- Check that you've entered the correct Clockify API token
- Ensure the token hasn't expired
- Try generating a new token in Clockify

### "OpenAI API key not configured" Error
- Add your OpenAI API key to the `.env` file
- Restart the development server after adding the key
- Alternatively, the app will prompt you to enter the key in the browser

### Voice Recording Not Working
- Ensure your browser has microphone permissions
- Check that your microphone is working
- Try using a different browser (Chrome/Firefox recommended)
- For Space key shortcut: make sure you're not focused on the text input

### Parsed Entries Look Wrong
- Be more specific in your commands
- Include project names, dates, and times clearly
- Try breaking complex commands into simpler ones

### Task Assignment Issues
- The app fetches available tasks from your Clockify projects
- Task assignment is based on intelligent matching - be descriptive about your activities
- If a task isn't assigned automatically, you can manually assign it in Clockify after submission

### "This Week" Showing Wrong Dates
- **Fixed**: The app now correctly interprets "this week" as the week containing today
- If today is Saturday and you say "Monday this week", it will use Monday of the current week

## Project Structure

```
src/
├── components/
│   ├── CommandInput.jsx    # Text and voice input with Space shortcut
│   ├── EntryPreview.jsx    # Preview parsed entries with task display
│   ├── Toast.jsx          # Notifications with detailed logging info
│   └── TokenForm.jsx      # API token management
├── utils/
│   ├── clockifyApi.js     # Clockify API integration with task support
│   ├── nlpParser.js       # OpenAI GPT-4o-mini parsing with task intelligence
│   └── whisperApi.js      # OpenAI Whisper transcription
├── App.jsx                # Main application
├── main.jsx              # React entry point
└── index.css             # TailwindCSS styles
```

## API Keys and Privacy

- **Clockify Token**: Stored in browser localStorage only
- **OpenAI API Key**: Used for parsing and transcription, stored locally
- **No Server**: Everything runs in your browser, no data sent to external servers except the APIs you explicitly use

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari (voice recording may have limitations)
- Edge

## License

MIT License - feel free to modify and use as needed. 