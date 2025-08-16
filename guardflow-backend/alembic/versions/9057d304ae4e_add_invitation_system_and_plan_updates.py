"""add_invitation_system_and_plan_updates

Revision ID: 9057d304ae4e
Revises: f67089825d64
Create Date: 2025-08-14 20:01:50.933316

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9057d304ae4e'
down_revision = 'f67089825d64'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_invitations table
    op.create_table('user_invitations',
        sa.Column('id', sa.String(36), primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role_id', sa.String(36), sa.ForeignKey('roles.id'), nullable=False),
        sa.Column('invited_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('invitation_token', sa.String(255), unique=True, nullable=False),
        sa.Column('status', sa.String(20), server_default=sa.text("'pending'")),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('accepted_at', sa.DateTime(timezone=True)),
    )
    
    # Add subscription and trial fields to tenants
    op.add_column('tenants', sa.Column('trial_ends_at', sa.DateTime(timezone=True)))
    op.add_column('tenants', sa.Column('subscription_status', sa.String(20), server_default=sa.text("'trial'")))
    op.add_column('tenants', sa.Column('stripe_customer_id', sa.String(255)))
    
    # Update existing plans with user limits and pricing
    op.execute("""
        INSERT INTO plans (name, max_users, max_tokens_per_month, price_per_month, features, is_active) VALUES 
        ('Pro', 20, 2000000, 99.00, '["api_proxy", "intent_classification", "advanced_analytics", "priority_support"]', true),
        ('Enterprise', 100, 10000000, 299.00, '["api_proxy", "intent_classification", "advanced_analytics", "dedicated_support", "custom_integrations"]', true)
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Update existing Basic plan
    op.execute("""
        UPDATE plans SET 
            max_users = 5,
            max_tokens_per_month = 500000,
            price_per_month = 49.00,
            features = '["api_proxy", "intent_classification", "basic_analytics"]'
        WHERE name = 'Basic';
    """)
    
    # Set trial period for existing default tenant
    op.execute("""
        UPDATE tenants SET 
            trial_ends_at = NOW() + INTERVAL '14 days',
            subscription_status = 'trial'
        WHERE slug = 'default';
    """)


def downgrade() -> None:
    # Remove columns from tenants
    op.drop_column('tenants', 'stripe_customer_id')
    op.drop_column('tenants', 'subscription_status')
    op.drop_column('tenants', 'trial_ends_at')
    
    # Drop user_invitations table
    op.drop_table('user_invitations')
    
    # Revert plan changes (optional - could leave as is)
    op.execute("""
        UPDATE plans SET 
            max_users = 10,
            max_tokens_per_month = 1000000,
            price_per_month = 99.00
        WHERE name = 'Basic';
    """)
    
    # Delete new plans
    op.execute("DELETE FROM plans WHERE name IN ('Pro', 'Enterprise')");