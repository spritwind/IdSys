USE [IdentitySysDB]
GO

/****** Object:  Table [dbo].[KeycloakGroup]    Script Date: 2025/12/19 下午 02:03:24 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[KeycloakGroup](
	[id] [nvarchar](50) NOT NULL,
	[name] [nvarchar](200) NOT NULL,
	[path] [nvarchar](500) NOT NULL,
	[parentId] [nvarchar](50) NULL,
	[description] [nvarchar](500) NULL,
	[subGroupCount] [int] NULL,
	[depth] [int] NULL,
	[dept_code] [nvarchar](50) NULL,
	[dept_ename] [nvarchar](100) NULL,
	[dept_zhname] [nvarchar](100) NULL,
	[manager] [nvarchar](100) NULL,
	[ENABLED] [bit] NULL,
	[INSDATE] [datetime] NULL,
	[UPDDATE] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[KeycloakGroup] ADD  DEFAULT ((0)) FOR [subGroupCount]
GO

ALTER TABLE [dbo].[KeycloakGroup] ADD  DEFAULT ((0)) FOR [depth]
GO

ALTER TABLE [dbo].[KeycloakGroup] ADD  DEFAULT ((1)) FOR [ENABLED]
GO

ALTER TABLE [dbo].[KeycloakGroup] ADD  DEFAULT (getdate()) FOR [INSDATE]
GO

ALTER TABLE [dbo].[KeycloakGroup] ADD  DEFAULT (getdate()) FOR [UPDDATE]
GO

