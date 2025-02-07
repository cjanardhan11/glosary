#!/bin/bash

# Define SAP system related variables
SAP_SYSTEM_STATUS_CMD="sapcontrol -nr 00 -function GetProcessList"  # Modify based on your environment
SAP_STOP_CMD="sapcontrol -nr 00 -function Stop"  # Modify based on your environment
SAP_START_CMD="sapcontrol -nr 00 -function Start"  # Modify based on your environment

# Function to check if the SAP system is up (count of "Running" is exactly 4)
check_sap_status() {
    # Run the command to check the SAP status
    SAP_STATUS=$( $SAP_SYSTEM_STATUS_CMD )
    
    # Count the occurrences of "Running"
    RUNNING_COUNT=$(echo "$SAP_STATUS" | grep -o "Running" | wc -l)

    # Check if "Running" appears exactly 4 times
    if [ "$RUNNING_COUNT" -eq 4 ]; then
        return 0  # SAP system is running
    else
        return 1  # SAP system is down
    fi
}

# Function to stop the SAP system
stop_sap_system() {
    echo "Stopping SAP system..."
    $SAP_STOP_CMD
    if [ $? -eq 0 ]; then
        echo "SAP stop command issued successfully. Waiting for system to stop..."
        wait_for_sap_to_stop
    else
        echo "Failed to stop SAP system."
        exit 1
    fi
}

# Function to wait until SAP system stops
wait_for_sap_to_stop() {
    while true; do
        echo "Checking SAP system status..."
        if ! check_sap_status; then
            echo "SAP system is stopped."
            break
        fi
        echo "SAP system is still running. Waiting..."
        sleep 10  # Check every 10 seconds
    done
}

# Function to start the SAP system
start_sap_system() {
    echo "Starting SAP system..."
    $SAP_START_CMD
    if [ $? -eq 0 ]; then
        echo "SAP start command issued successfully. Waiting for system to start..."
        wait_for_sap_to_start
    else
        echo "Failed to start SAP system."
        exit 1
    fi
}

# Function to wait until SAP system starts
wait_for_sap_to_start() {
    MAX_RETRIES=30   # Max retries before exiting (e.g., 30 * 10 seconds = 5 minutes)
    RETRY_COUNT=0
    
    while true; do
        echo "Checking SAP system status..."
        if check_sap_status; then
            echo "SAP system is running."
            break
        fi

        # Increment retry counter and check if we've exceeded max retries
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            echo "SAP system did not start after multiple attempts."
            exit 1  # Exit after max retries
        fi

        echo "SAP system is still down. Waiting... Attempt $RETRY_COUNT/$MAX_RETRIES"
        sleep 10  # Check every 10 seconds
    done
}

# Main logic of the script
echo "Checking current SAP system status..."
echo "SAP System Hostname : "

# Check if the SAP system is up (Running count is exactly 4)
if check_sap_status; then
    echo "SAP Process Status  : Running"
    stop_sap_system
    
    # Check SAP system status again after stopping
    echo "Checking SAP system status after stop..."
    if check_sap_status; then
        echo "SAP system is still running after stopping. Investigate further."
        exit 1
    else
        echo "SAP system is down after stop."
        # Start the SAP system as it is down
        start_sap_system
    fi
else
    echo "SAP system is down. Starting SAP system..."
    start_sap_system
fi
