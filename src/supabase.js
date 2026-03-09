import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://omjjpglfhpuyafxwkpsk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tampwZ2xmaHB1eWFmeHdrcHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzQ3OTAsImV4cCI6MjA4ODYxMDc5MH0.Uxh7qDMenwk7pct2kTfl40tMzfqMa3FAxMCp2OiT0zM'

export const supabase = createClient(supabaseUrl, supabaseKey)