# Teacher Guide

This guide covers everything you need to know to set up and manage LearnQuest for your classroom.

---

## Table of Contents

1. [First-Time Setup](#first-time-setup)
2. [Logging In](#logging-in)
3. [Adding Students](#adding-students)
4. [The Student Experience](#the-student-experience)
5. [Assigning Work](#assigning-work)
6. [Viewing Progress](#viewing-progress)
7. [Individual Student Reports](#individual-student-reports)
8. [Exporting Reports](#exporting-reports)
9. [Managing the Leaderboard](#managing-the-leaderboard)
10. [Settings Configuration](#settings-configuration)
11. [Managing Multiple Classes](#managing-multiple-classes)
12. [Tips for Success](#tips-for-success)

---

## First-Time Setup

### 1. Install and Start LearnQuest

Follow the [Installation Guide](INSTALLATION.md) to get LearnQuest running on your computer. The short version:

```bash
git clone https://github.com/edwardxiong2027/LearnQuest-Node.git
cd LearnQuest-Node
./scripts/setup.sh    # Installs everything
./scripts/start.sh    # Starts the server
```

### 2. Open the Application

Open your browser and go to [http://localhost:5000](http://localhost:5000).

### 3. Log In as Teacher

On first launch, a default teacher account is created:

- **Name:** `teacher`
- **PIN:** `1234`

**Important:** Change the default PIN in Settings after your first login.

### 4. Complete the Setup Wizard

If this is the first time running LearnQuest, you will see a setup wizard that:
- Checks if the AI engine (Ollama) is running
- Verifies the AI model is downloaded
- Lets you create or confirm your teacher account

---

## Logging In

1. Open LearnQuest in a browser.
2. Enter your **name** and **PIN**.
3. Click **Log In**.

Teachers see the Teacher Dashboard. Students see the Student Home screen.

---

## Adding Students

### From the Teacher Dashboard

1. Log in as the teacher.
2. Navigate to the **Teacher Dashboard** (accessible from the main menu or navigation bar).
3. Click **Add Student**.
4. Enter:
   - **Student Name** -- How the student's name will appear in the system.
   - **PIN** -- A simple numeric PIN the student will use to log in (e.g., 1234). Keep it simple for younger students.
   - **Grade Level** -- Select the student's grade (K through 8). This determines which curriculum content is shown.
5. Click **Create Student**.

### Tips for Student Accounts

- PINs do not need to be unique across students (each student's name + PIN combination is unique).
- For younger students (K-2), consider using very simple PINs like `1111` or `1234`.
- Students do not need email addresses. The system is designed to work without any personal information.
- You can change a student's grade level later in Settings if they need to move up or down.

---

## The Student Experience

When a student logs in, they see:

### Home Screen
- A welcome message with their name and avatar
- Their daily streak counter (how many consecutive days they have used LearnQuest)
- A "Continue Learning" button that picks up where they left off
- An XP bar showing progress toward the next level
- Subject cards (Math, Science, ELA, Social Studies) with progress indicators
- Recently earned badges
- A daily challenge for bonus XP

### Learning Flow
1. Student picks a **subject** (Math, Science, ELA, Social Studies).
2. They see **units** organized in a visual progression.
3. They click a **lesson** to read the explanation and examples.
4. They complete **practice problems** with immediate feedback.
5. If stuck, they click "I don't understand" to open the **AI Tutor** chat.
6. After completing all lessons in a unit, they take a **unit quiz**.
7. Passing the quiz earns a **badge** and unlocks the next unit.

### AI Tutor
- The AI tutor uses the Socratic method -- it guides students to discover answers rather than giving them directly.
- It adjusts language and complexity based on the student's grade level.
- Students can ask for hints, alternative explanations, or additional practice problems.
- All AI interactions are private and stored locally.

---

## Assigning Work

### Viewing Available Content

From the Teacher Dashboard, you can browse the full curriculum:
- **Math** -- K-8 aligned to Common Core standards
- **Science** -- K-8 covering life science, physical science, earth science
- **ELA** -- K-8 covering reading comprehension, writing, grammar, vocabulary
- **Social Studies** -- K-8 covering history, geography, civics, economics

### Enabling / Disabling Content

You can control which subjects and units are available to students:
1. Go to **Teacher Dashboard > Content Management**.
2. Toggle subjects or individual units on/off.
3. Disabled content will not appear in the student view.

### Custom Quizzes

You can create custom quizzes:
1. Go to **Teacher Dashboard > Quiz Builder**.
2. Select questions from the existing question bank, or use the AI to generate new questions.
3. Set a title, passing score, and optional time limit.
4. Assign the quiz to specific students or the entire class.

---

## Viewing Progress

### Class Overview

The Teacher Dashboard shows a **progress grid** with:
- Rows: Each student
- Columns: Each subject
- Cells: Color-coded status
  - **Green** -- On track (completed recent lessons, passing quizzes)
  - **Yellow** -- Needs attention (falling behind or low quiz scores)
  - **Red** -- Struggling (no activity or failing quizzes)
  - **Gray** -- Not started

### Quick Stats

At the top of the dashboard, you can see:
- Total number of students
- Average class XP
- Most active students this week
- Subjects where students are struggling most

---

## Individual Student Reports

Click on any student's name in the progress grid to see their detailed report:

### Overview
- Current level and total XP
- Daily streak
- Time spent learning (total and per subject)
- Login history

### By Subject
For each subject, you can see:
- Which units and lessons are completed
- Quiz scores with date and time
- Areas of strength and weakness
- Time spent per lesson

### Quiz History
- Every quiz attempt with score, time taken, and individual question results
- You can see which specific questions a student got wrong to identify patterns

### AI Tutor Usage
- How often the student uses the AI tutor
- What topics they ask about most
- This can indicate areas where they need extra support

---

## Exporting Reports

### Export to CSV

1. Go to **Teacher Dashboard > Export**.
2. Select the data to export:
   - **Student Progress** -- All students with their levels, XP, and completion percentages per subject
   - **Quiz Results** -- All quiz attempts with scores and details
   - **Activity Log** -- Login dates, lessons completed, time spent
3. Click **Export CSV**.
4. The file downloads to your computer.

### Using the Data

The CSV files can be opened in:
- Microsoft Excel
- Google Sheets
- Apple Numbers
- Any spreadsheet application

This data is useful for:
- Parent-teacher conferences
- IEP progress monitoring
- Identifying students who need intervention
- Reporting to administrators

---

## Managing the Leaderboard

The class leaderboard shows students ranked by XP. It can motivate students through friendly competition.

### Enable / Disable

1. Go to **Teacher Dashboard > Settings**.
2. Toggle **Leaderboard** on or off.
3. When disabled, students cannot see the leaderboard.

### Considerations

- The leaderboard shows XP, not grades -- rewarding effort and engagement.
- Some students thrive with competition; others may find it discouraging.
- You can enable it for a trial period and observe the effect on your class.

---

## Settings Configuration

Access settings from **Teacher Dashboard > Settings**.

### Available Settings

| Setting | Description | Default |
|---|---|---|
| Leaderboard | Show/hide the class leaderboard | Enabled |
| Quiz Timer | Enable a countdown timer on quizzes | Disabled |
| Quiz Timer Duration | Seconds allowed per quiz (when timer is enabled) | 300 (5 min) |
| Gamification | Enable/disable XP, badges, and levels | Enabled |
| Deployment Mode | Personal or classroom mode | Personal |

### Changing the Teacher PIN

1. Go to **Settings > Account**.
2. Enter your current PIN.
3. Enter and confirm a new PIN.
4. Click **Update PIN**.

---

## Managing Multiple Classes

If you teach multiple classes or grade levels:

### Option 1: Separate Databases

Run LearnQuest with different database files:
```bash
# Period 1 - Grade 3
DB_PATH=database/period1.db npm start

# Period 2 - Grade 5
DB_PATH=database/period2.db npm start
```

### Option 2: Single Database

Keep all students in one database. Use naming conventions to distinguish classes:
- "Alice (P1)" for Period 1
- "Bob (P2)" for Period 2

The teacher dashboard shows all students, and you can sort and filter by name.

---

## Tips for Success

### Getting Started
- Start with one subject. Let students get comfortable with the interface before introducing all four subjects.
- Do a guided walkthrough with the class on the first day.
- Let students choose their own avatars -- they love personalizing their experience.

### Daily Routine
- Begin with the **Daily Challenge** -- it takes 2 minutes and gets students engaged.
- Encourage students to maintain their **daily streaks** -- even 10 minutes of practice counts.
- Review the **progress grid** at the end of each week to identify students who need support.

### For Younger Students (K-2)
- Set simple PINs (e.g., `1111`).
- Have the AI tutor open by default so students can ask questions easily.
- Focus on Math and ELA, where the interactive practice is most beneficial.

### For Older Students (6-8)
- Enable the quiz timer to build test-taking skills.
- Encourage use of the AI tutor for deeper understanding.
- Use the leaderboard to foster healthy competition.

### Technical Tips
- LearnQuest works best on Chrome or Firefox.
- If running on a classroom network, ensure the firewall allows port 5000.
- Keep the LearnQuest computer plugged in -- the AI model uses CPU resources.
- Back up the `database/learnquest.db` file regularly to preserve student progress.

---

## Getting Help

- **GitHub Issues:** [Report a bug or request a feature](https://github.com/edwardxiong2027/LearnQuest-Node/issues)
- **Website:** [learnquest2026.web.app](https://learnquest2026.web.app/)
- **Architecture Docs:** See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
