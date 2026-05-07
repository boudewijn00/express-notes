#!/usr/bin/env node

/**
 * Newsletter sending script
 * 
 * This script sends newsletters to subscribers based on their preferences.
 * It should be scheduled to run every Monday.
 * 
 * Usage:
 *   node src/send-newsletter.js
 * 
 * The script will:
 * - Check if today is Monday
 * - Check if it's the first Monday of the month (for monthly subscribers)
 * - Fetch subscribers from PostgREST
 * - Send weekly newsletters to weekly subscribers
 * - Send monthly newsletters to monthly subscribers (only on first Monday)
 */

require('dotenv').config();
const { getSubscribers, getNotesFromPastWeek, getNotesFromPastMonth, articlesFolder } = require('./data');
const { createTransporter, sendEmail } = require('./email');
const { generateNewsletterHTML } = require('./newsletter-template');

/**
 * Check if today is Monday
 */
function isMonday() {
    const today = new Date();
    return today.getDay() === 1; // 0 = Sunday, 1 = Monday, etc.
}

/**
 * Check if today is the first Monday of the month
 */
function isFirstMondayOfMonth() {
    const today = new Date();
    if (today.getDay() !== 1) return false; // Not Monday
    
    const dayOfMonth = today.getDate();
    // First Monday must be between 1st and 7th
    return dayOfMonth <= 7;
}

/**
 * Send newsletters to subscribers
 */
async function sendNewsletters() {
    console.log('Starting newsletter send process...');
    console.log(`Date: ${new Date().toISOString()}`);
    
    // Check if it's Monday
    if (!isMonday()) {
        console.log('Not Monday - newsletters are only sent on Mondays. Exiting.');
        return;
    }
    
    const isFirstMonday = isFirstMondayOfMonth();
    console.log(`Is Monday: Yes`);
    console.log(`Is First Monday of Month: ${isFirstMonday ? 'Yes' : 'No'}`);
    
    try {
        // Fetch subscribers
        console.log('\nFetching subscribers...');
        const subscribers = await getSubscribers();
        console.log(`Found ${subscribers.length} subscribers`);
        
        if (subscribers.length === 0) {
            console.log('No subscribers found. Exiting.');
            return;
        }
        
        // Create email transporter
        console.log('\nInitializing email transporter...');
        const transporter = createTransporter();
        console.log('Email transporter created successfully');
        
        // Filter subscribers by preference
        const weeklySubscribers = subscribers.filter(s => 
            s.frequency === 'weekly' || s.frequency === 'week'
        );
        const monthlySubscribers = subscribers.filter(s => 
            s.frequency === 'monthly' || s.frequency === 'month'
        );
        
        console.log(`\nSubscribers breakdown:`);
        console.log(`  Weekly: ${weeklySubscribers.length}`);
        console.log(`  Monthly: ${monthlySubscribers.length}`);
        
        let sentCount = 0;
        let failedCount = 0;
        
        // Send weekly newsletters
        if (weeklySubscribers.length > 0) {
            console.log('\n--- Sending Weekly Newsletters ---');
            
            // Fetch notes from past week
            console.log('Fetching notes from past week...');
            const allNotes = await getNotesFromPastWeek();
            const regularNotes = allNotes.filter(n => n.parent_id !== articlesFolder);
            const articleNotes = allNotes.filter(n => n.parent_id === articlesFolder);
            console.log(`Found ${regularNotes.length} notes and ${articleNotes.length} articles`);
            
            // Generate email HTML
            const weeklyHTML = generateNewsletterHTML(regularNotes, articleNotes, 'week');
            const weeklySubject = '📧 Weekly Newsletter - Notes & Articles';
            
            // Send to each weekly subscriber
            for (const subscriber of weeklySubscribers) {
                console.log(`Sending to ${subscriber.email}...`);
                const result = await sendEmail(transporter, subscriber.email, weeklySubject, weeklyHTML);
                if (result.success) {
                    console.log(`  ✓ Sent successfully`);
                    sentCount++;
                } else {
                    console.log(`  ✗ Failed: ${result.error}`);
                    failedCount++;
                }
            }
        }
        
        // Send monthly newsletters (only on first Monday)
        if (isFirstMonday && monthlySubscribers.length > 0) {
            console.log('\n--- Sending Monthly Newsletters ---');
            
            // Fetch notes from past month
            console.log('Fetching notes from past month...');
            const allNotes = await getNotesFromPastMonth();
            const regularNotes = allNotes.filter(n => n.parent_id !== articlesFolder);
            const articleNotes = allNotes.filter(n => n.parent_id === articlesFolder);
            console.log(`Found ${regularNotes.length} notes and ${articleNotes.length} articles`);
            
            // Generate email HTML
            const monthlyHTML = generateNewsletterHTML(regularNotes, articleNotes, 'month');
            const monthlySubject = '📧 Monthly Newsletter - Notes & Articles';
            
            // Send to each monthly subscriber
            for (const subscriber of monthlySubscribers) {
                console.log(`Sending to ${subscriber.email}...`);
                const result = await sendEmail(transporter, subscriber.email, monthlySubject, monthlyHTML);
                if (result.success) {
                    console.log(`  ✓ Sent successfully`);
                    sentCount++;
                } else {
                    console.log(`  ✗ Failed: ${result.error}`);
                    failedCount++;
                }
            }
        } else if (!isFirstMonday && monthlySubscribers.length > 0) {
            console.log('\nSkipping monthly newsletters (not the first Monday of the month)');
        }
        
        console.log('\n=== Newsletter Send Complete ===');
        console.log(`Successfully sent: ${sentCount}`);
        console.log(`Failed: ${failedCount}`);
        
    } catch (error) {
        console.error('\nError sending newsletters:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    sendNewsletters()
        .then(() => {
            console.log('\nScript completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('\nScript failed:', error);
            process.exit(1);
        });
}

module.exports = { sendNewsletters };
