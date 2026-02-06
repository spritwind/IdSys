// UC Capital Identity System
// Multi-tenant DbContext for Organizations, Groups, and Permissions

using System;
using Microsoft.EntityFrameworkCore;
using Skoruba.Duende.IdentityServer.Admin.EntityFramework.Entities;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.DbContexts
{
    /// <summary>
    /// 多租戶 DbContext - 管理組織、群組、權限
    /// </summary>
    public class MultiTenantDbContext : DbContext
    {
        public MultiTenantDbContext(DbContextOptions<MultiTenantDbContext> options) : base(options)
        {
        }

        // Tenants
        public DbSet<Tenant> Tenants { get; set; }

        // Organizations
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<OrganizationMember> OrganizationMembers { get; set; }

        // Groups
        public DbSet<Group> Groups { get; set; }
        public DbSet<GroupMember> GroupMembers { get; set; }

        // Positions & Deputies
        public DbSet<Position> Positions { get; set; }
        public DbSet<Deputy> Deputies { get; set; }

        // Permissions
        public DbSet<PermissionResource> PermissionResources { get; set; }
        public DbSet<PermissionScope> PermissionScopes { get; set; }
        public DbSet<Permission> Permissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Tenant
            modelBuilder.Entity<Tenant>(entity =>
            {
                entity.ToTable("Tenants");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Code).IsUnique();
            });

            // Organization
            modelBuilder.Entity<Organization>(entity =>
            {
                entity.ToTable("Organizations");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId);
                entity.HasIndex(e => e.Path);

                entity.HasOne(e => e.Tenant)
                    .WithMany(t => t.Organizations)
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Parent)
                    .WithMany(e => e.Children)
                    .HasForeignKey(e => e.ParentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // OrganizationMember
            modelBuilder.Entity<OrganizationMember>(entity =>
            {
                entity.ToTable("OrganizationMembers");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.OrganizationId, e.UserId }).IsUnique();

                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.Members)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Position)
                    .WithMany()
                    .HasForeignKey(e => e.PositionId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Group
            modelBuilder.Entity<Group>(entity =>
            {
                entity.ToTable("Groups");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId);
                entity.HasIndex(e => e.OrganizationId);
                entity.HasIndex(e => e.SourceId);
                entity.HasIndex(e => e.GroupType);

                entity.Property(e => e.OrganizationId).IsRequired(false);
                entity.Property(e => e.SourceId).IsRequired(false);

                entity.HasOne(e => e.Tenant)
                    .WithMany(t => t.Groups)
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                // OrganizationId 為弱關聯，不建立 FK constraint
            });

            // GroupMember
            modelBuilder.Entity<GroupMember>(entity =>
            {
                entity.ToTable("GroupMembers");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.GroupId, e.UserId }).IsUnique();

                entity.HasOne(e => e.Group)
                    .WithMany(g => g.Members)
                    .HasForeignKey(e => e.GroupId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Position
            modelBuilder.Entity<Position>(entity =>
            {
                entity.ToTable("Positions");
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Deputy
            modelBuilder.Entity<Deputy>(entity =>
            {
                entity.ToTable("Deputies");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.PrincipalUserId);
                entity.HasIndex(e => e.DeputyUserId);
                entity.HasIndex(e => new { e.StartDate, e.EndDate });

                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // PermissionResource
            modelBuilder.Entity<PermissionResource>(entity =>
            {
                entity.ToTable("PermissionResources");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => e.TenantId);

                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Parent)
                    .WithMany(e => e.Children)
                    .HasForeignKey(e => e.ParentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // PermissionScope
            modelBuilder.Entity<PermissionScope>(entity =>
            {
                entity.ToTable("PermissionScopes");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Code).IsUnique();
            });

            // Permission
            modelBuilder.Entity<Permission>(entity =>
            {
                // 使用 HasTrigger 告知 EF Core 此表有觸發程序，
                // 讓 SaveChanges 使用 OUTPUT INTO 而非直接 OUTPUT
                entity.ToTable("Permissions", tb => tb.HasTrigger("Permissions_Triggers"));
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SubjectName).HasMaxLength(200);
                entity.HasIndex(e => new { e.SubjectType, e.SubjectId });
                entity.HasIndex(e => e.SubjectName);
                entity.HasIndex(e => e.ResourceId);
                entity.HasIndex(e => e.TenantId);

                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Resource)
                    .WithMany(r => r.Permissions)
                    .HasForeignKey(e => e.ResourceId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
