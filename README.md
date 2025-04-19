# ScheduleSync

ScheduleSync simplifies multiplayer gameplay for Schedule I by using cloud syncing. This lets you play together without a dedicated host.

## How to Run

1. Clone the repository:  
   git clone https://github.com/pozgerab/ScheduleSync

2. Install the necessary tools:  
   • Download and install Go from https://golang.org/dl/  
   • Download and install Node.js from https://nodejs.org/  
   • Install Wails by following the instructions at https://wails.io/docs/gettingstarted/installation

3. Setup Node:  
   Open a terminal in the project directory and run:  
   npm install

4. Build and run the project:  
   • To create an executable, run:  
    wails build  
   • Or, to start a local development version, run:  
    wails dev

## Authentication

Authentication is performed entirely on your machine and is never uploaded anywhere. Currently, the only supported cloud service is Google Storage. It is best to use a service account from the Google Cloud Console.

**!!! You should only share your authentication with those WHO YOU TRUST and will play with as those with your authentication data can access you cloud storage.**

**MAKE SURE TO ONLY GIVE THE NECESSARY PERMISSIONS TO THE SERVICE ACCOUNT FOR SECURITY REASONS**

If you want to stop using this project, delete the `%appdata%/schedulesync/credentials.json` file just in case.

### Using a Credentials File

For a more convenient approach, save your downloaded credentials JSON file to `%appdata%/schedulesync/` and rename it to `credentials.json`.

### In-Code Setup

For quick testing, you can insert your authentication data directly in the `creds` struct in `app.go` at line 117. Running the app will then generate a file on your device with your auth data.
