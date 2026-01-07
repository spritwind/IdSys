// Copyright (c) Jan Škoruba. All Rights Reserved.
// Licensed under the Apache License, Version 2.0.

using System;
using Microsoft.AspNetCore.Identity;

namespace Skoruba.Duende.IdentityServer.Admin.EntityFramework.Shared.Entities.Identity
{
	public class UserIdentity : IdentityUser
	{
		/// <summary>
		/// 名字
		/// </summary>
		public string FirstName { get; set; }

		/// <summary>
		/// 姓氏
		/// </summary>
		public string LastName { get; set; }

		/// <summary>
		/// 顯示名稱 (中文姓名)
		/// </summary>
		public string DisplayName { get; set; }

		/// <summary>
		/// 主要組織 ID
		/// </summary>
		public Guid? PrimaryOrganizationId { get; set; }

		/// <summary>
		/// 租戶 ID
		/// </summary>
		public Guid? TenantId { get; set; }

		/// <summary>
		/// 是否啟用
		/// </summary>
		public bool IsActive { get; set; } = true;

		/// <summary>
		/// 建立時間
		/// </summary>
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

		/// <summary>
		/// 更新時間
		/// </summary>
		public DateTime? UpdatedAt { get; set; }
	}
}