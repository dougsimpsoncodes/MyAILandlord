-- My AI Landlord - Supabase Database Schema
-- Run this SQL in your Supabase SQL editor to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
-- Note: Comment out any types that already exist in your database
CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file');
CREATE TYPE announcement_priority AS ENUM ('low', 'medium', 'high');

-- Profiles table (extends Clerk user data)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant-Property linking table (many-to-many with additional metadata)
CREATE TABLE tenant_property_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_number TEXT,
    lease_start_date DATE,
    lease_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, property_id, unit_number)
);

-- Maintenance requests table
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority request_priority DEFAULT 'medium',
    status request_status DEFAULT 'pending',
    area TEXT NOT NULL,
    asset TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    images TEXT[], -- Array of image URLs
    voice_notes TEXT[], -- Array of voice note URLs
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    assigned_vendor_email TEXT,
    vendor_notes TEXT,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (for tenant-landlord communication)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table (landlord to tenants)
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- NULL means all properties
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority announcement_priority DEFAULT 'medium',
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_property_links_updated_at BEFORE UPDATE ON tenant_property_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX idx_tenant_property_links_tenant_id ON tenant_property_links(tenant_id);
CREATE INDEX idx_tenant_property_links_property_id ON tenant_property_links(property_id);
CREATE INDEX idx_tenant_property_links_active ON tenant_property_links(is_active);
CREATE INDEX idx_maintenance_requests_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_requests_property_id ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_created_at ON maintenance_requests(created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_announcements_landlord_id ON announcements(landlord_id);
CREATE INDEX idx_announcements_property_id ON announcements(property_id);

-- Insert sample data (optional, for testing)
-- You can remove this section in production

-- Sample landlord profile
INSERT INTO profiles (clerk_user_id, email, name, role) VALUES 
('sample_landlord_123', 'landlord@example.com', 'John Landlord', 'landlord');

-- Sample tenant profile  
INSERT INTO profiles (clerk_user_id, email, name, role) VALUES 
('sample_tenant_456', 'tenant@example.com', 'Jane Tenant', 'tenant');

-- Sample property
INSERT INTO properties (landlord_id, name, address, description) VALUES 
((SELECT id FROM profiles WHERE clerk_user_id = 'sample_landlord_123'), 
 'Sunset Apartments', 
 '123 Main St, Anytown, ST 12345', 
 'Modern apartment complex with 20 units');

-- Link tenant to property
INSERT INTO tenant_property_links (tenant_id, property_id, unit_number) VALUES 
((SELECT id FROM profiles WHERE clerk_user_id = 'sample_tenant_456'),
 (SELECT id FROM properties WHERE name = 'Sunset Apartments'),
 '4B');

-- Sample maintenance request
INSERT INTO maintenance_requests (tenant_id, property_id, title, description, priority, area, asset, issue_type) VALUES 
((SELECT id FROM profiles WHERE clerk_user_id = 'sample_tenant_456'),
 (SELECT id FROM properties WHERE name = 'Sunset Apartments'),
 'Kitchen Sink Leak',
 'Water is dripping from under the kitchen sink. It seems to be getting worse.',
 'medium',
 'Kitchen',
 'Sink',
 'Plumbing Issue');
