"""add_multi_tenant_schema

Revision ID: f67089825d64
Revises: 99e992a6f41e
Create Date: 2025-08-14 18:06:04.155649

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f67089825d64'
down_revision = '99e992a6f41e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable UUID extension first
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    
    # Create plans table first (referenced by tenants)
    op.create_table('plans',
        sa.Column('id', sa.String(36), primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('max_users', sa.Integer()),
        sa.Column('max_tokens_per_month', sa.BigInteger()),
        sa.Column('price_per_month', sa.DECIMAL(10, 2)),
        sa.Column('features', sa.JSON(), server_default=sa.text("'[]'")),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    
    # Create tenants table
    op.create_table('tenants',
        sa.Column('id', sa.String(36), primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('status', sa.String(20), server_default=sa.text("'trial'")),
        sa.Column('plan_id', sa.String(36), sa.ForeignKey('plans.id')),
        sa.Column('billing_email', sa.String(255)),
        sa.Column('contact_name', sa.String(255)),
        sa.Column('trial_expires_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    
    # Create roles table
    op.create_table('roles',
        sa.Column('id', sa.String(36), primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('name', sa.String(50), nullable=False, unique=True),
        sa.Column('description', sa.Text()),
        sa.Column('permissions', sa.JSON(), server_default=sa.text("'[]'")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    
    # Create llm_providers table
    op.create_table('llm_providers',
        sa.Column('id', sa.String(36), primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE')),
        sa.Column('provider_name', sa.String(50), nullable=False),
        sa.Column('provider_instance_name', sa.String(100), nullable=False),
        sa.Column('api_key_encrypted', sa.Text(), nullable=False),
        sa.Column('api_endpoint', sa.String(255)),
        sa.Column('available_models', sa.JSON(), server_default=sa.text("'[]'")),
        sa.Column('enabled_models', sa.JSON(), server_default=sa.text("'[]'")),
        sa.Column('is_default', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    
    # Create unique constraint for llm_providers
    op.create_unique_constraint(
        'uq_tenant_provider_instance', 
        'llm_providers', 
        ['tenant_id', 'provider_name', 'provider_instance_name']
    )
    
    # Add tenant_id and role_id to existing tables
    op.add_column('users', sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id')))
    op.add_column('users', sa.Column('role_id', sa.String(36), sa.ForeignKey('roles.id')))
    
    op.add_column('tasks', sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id')))
    op.add_column('tasks', sa.Column('llm_provider_id', sa.String(36), sa.ForeignKey('llm_providers.id')))
    
    op.add_column('logs', sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id')))
    
    op.add_column('chats', sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id')))
    
    # Add tenant_id to alerts table if it exists
    try:
        op.add_column('alerts', sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id')))
    except:
        pass  # Table might not exist yet
    
    # Insert default roles with better error handling
    try:
        op.execute("""
            INSERT INTO roles (id, name, description, permissions) VALUES 
            (gen_random_uuid()::text, 'super_admin', 'Platform administrator with full access', '["manage_tenants", "manage_plans", "global_analytics"]'),
            (gen_random_uuid()::text, 'admin', 'Tenant administrator with company-wide access', '["manage_users", "manage_tasks", "manage_providers", "view_analytics"]'),
            (gen_random_uuid()::text, 'user', 'Standard user with task access only', '["use_tasks", "view_own_usage"]')
            ON CONFLICT (name) DO NOTHING
        """)
    except Exception as e:
        print(f"Warning: Could not insert default roles: {e}")
        pass
    
    # Insert default plan with better error handling
    try:
        op.execute("""
            INSERT INTO plans (id, name, max_users, max_tokens_per_month, price_per_month, features) VALUES 
            (gen_random_uuid()::text, 'Basic', 10, 1000000, 99.00, '["api_proxy", "intent_classification", "basic_analytics"]')
            ON CONFLICT (name) DO NOTHING
        """)
    except Exception as e:
        print(f"Warning: Could not insert default plan: {e}")
        pass


def downgrade() -> None:
    # Remove columns from existing tables
    op.drop_column('chats', 'tenant_id')
    op.drop_column('logs', 'tenant_id')
    op.drop_column('tasks', 'llm_provider_id')
    op.drop_column('tasks', 'tenant_id')
    op.drop_column('users', 'role_id')
    op.drop_column('users', 'tenant_id')
    
    # Drop new tables (in reverse order due to foreign keys)
    op.drop_table('llm_providers')
    op.drop_table('roles')
    op.drop_table('tenants')
    op.drop_table('plans')