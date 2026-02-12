const express = require('express');
const router = express.Router();
const axios = require('axios');

// Constants
const MAX_TOPICS = 10;
const DEFAULT_FREQUENCY = 'weekly';
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Helper function for newsletter page rendering
const renderNewsletterPage = (res, options = {}) => {
    res.render('newsletter', {
        layout: 'main',
        sidebarSpace: true,
        ...options,
        // SEO
        pageTitle: 'Newsletter Subscription',
        canonicalUrl: `${process.env.SITE_URL || 'https://notes.hello-data.nl'}/newsletter`,
        metaDescription: 'Subscribe to our newsletter to receive updates about web development notes and articles',
    });
};

// Helper function to get topic folders for newsletter
const getTopicFolders = async (getFolders, articlesFolder) => {
    try {
        const folders = await getFolders();
        return folders.filter(f => f.folder_id !== articlesFolder);
    } catch (error) {
        return [];
    }
};

// Validation function
const validateNewsletterForm = (formData) => {
    const errors = {};
    
    // Validate first name
    if (!formData.first_name || formData.first_name.trim().length === 0) {
        errors.first_name = 'First name is required';
    }
    
    // Validate last name
    if (!formData.last_name || formData.last_name.trim().length === 0) {
        errors.last_name = 'Last name is required';
    }
    
    // Validate email
    if (!formData.email || formData.email.trim().length === 0) {
        errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formData.email)) {
        errors.email = 'Please provide a valid email address';
    }
    
    // Validate frequency
    const validFrequencies = ['weekly', 'monthly'];
    if (formData.frequency && !validFrequencies.includes(formData.frequency)) {
        errors.frequency = 'Please select a valid frequency';
    }
    
    return errors;
};

// Initialize routes with dependencies
const initializeRoutes = (getFolders, articlesFolder, config) => {
    
    // GET /newsletter - Display the newsletter subscription form
    router.get('/', async (req, res) => {
        const topicFolders = await getTopicFolders(getFolders, articlesFolder);
        renderNewsletterPage(res, { folders: topicFolders });
    });

    // POST /newsletter - Handle form submission
    router.post('/', async (req, res) => {
        try {
            // Extract and trim/normalize fields immediately to ensure consistency
            const first_name = req.body.first_name ? req.body.first_name.trim() : '';
            const last_name = req.body.last_name ? req.body.last_name.trim() : '';
            const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
            const frequency = req.body.frequency ? req.body.frequency.trim() : DEFAULT_FREQUENCY;
            // Topics can be a single value or an array when multiple checkboxes are checked
            const topicsInput = req.body.topics;
            
            // Get valid topic folders for validation
            const topicFolders = await getTopicFolders(getFolders, articlesFolder);
            const validTopicTitles = topicFolders.map(f => f.title);
            
            // Validate form data
            const formData = { first_name, last_name, email, frequency, topics: topicsInput };
            const errors = validateNewsletterForm(formData);
            
            // If there are validation errors, re-render the form with errors
            if (Object.keys(errors).length > 0) {
                return renderNewsletterPage(res, {
                    errors,
                    formData, // Preserve user input
                    folders: topicFolders
                });
            }
            
            // Process and validate topics - can be string, array, or undefined
            let topics = [];
            if (topicsInput) {
                if (Array.isArray(topicsInput)) {
                    topics = topicsInput
                        .map(t => t.trim())
                        .filter(t => t.length > 0 && validTopicTitles.includes(t))
                        .slice(0, MAX_TOPICS);
                } else if (typeof topicsInput === 'string') {
                    const trimmed = topicsInput.trim();
                    if (trimmed && validTopicTitles.includes(trimmed)) {
                        topics = [trimmed];
                    }
                }
            }

            // Prepare the data for PostgREST
            const subscriberData = {
                first_name,
                last_name,
                email,
                frequency,
                topics
            };

            // Post to PostgREST subscribers endpoint
            await axios.post(`${process.env.POSTGREST_HOST}/subscribers`, subscriberData, config);

            renderNewsletterPage(res, { success: true });
        } catch (error) {
            // Check for duplicate email error (PostgreSQL unique constraint violation)
            const topicFolders = await getTopicFolders(getFolders, articlesFolder);
            
            if (error.response && error.response.status === 409) {
                return renderNewsletterPage(res, {
                    errors: { email: 'This email is already subscribed to our newsletter' },
                    formData: req.body,
                    folders: topicFolders
                });
            } else if (error.response && error.response.status === 400) {
                return renderNewsletterPage(res, {
                    errors: { general: 'Invalid data provided. Please check your input.' },
                    formData: req.body,
                    folders: topicFolders
                });
            }
            
            // General error
            renderNewsletterPage(res, {
                errors: { general: 'Failed to subscribe. Please try again later.' },
                formData: req.body,
                folders: topicFolders
            });
        }
    });
    
    return router;
};

module.exports = initializeRoutes;
