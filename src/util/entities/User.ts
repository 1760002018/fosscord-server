/*
	Fosscord: A FOSS re-implementation and extension of the Discord.com backend.
	Copyright (C) 2023 Fosscord and Fosscord Contributors
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published
	by the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Request } from "express";
import {
	Column,
	Entity,
	FindOneOptions,
	JoinColumn,
	OneToMany,
	OneToOne,
} from "typeorm";
import { Config, Snowflake, trimSpecial } from "..";
import { BitField } from "../util/BitField";
import { BaseClass } from "./BaseClass";
import { ConnectedAccount } from "./ConnectedAccount";
import { Member } from "./Member";
import { Relationship } from "./Relationship";
import { SecurityKey } from "./SecurityKey";
import { Session } from "./Session";
import { UserSettings } from "./UserSettings";

export enum PublicUserEnum {
	username,
	discriminator,
	id,
	public_flags,
	avatar,
	accent_color,
	banner,
	bio,
	bot,
	premium_since,
	premium_type,
	theme_colors,
	pronouns,
}
export type PublicUserKeys = keyof typeof PublicUserEnum;

export enum PrivateUserEnum {
	flags,
	mfa_enabled,
	email,
	phone,
	verified,
	nsfw_allowed,
	premium,
	premium_type,
	purchased_flags,
	premium_usage_flags,
	disabled,
	// settings,	// now a relation
	// locale
}
export type PrivateUserKeys = keyof typeof PrivateUserEnum | PublicUserKeys;

export const PublicUserProjection = Object.values(PublicUserEnum).filter(
	(x) => typeof x === "string",
) as PublicUserKeys[];
export const PrivateUserProjection = [
	...PublicUserProjection,
	...Object.values(PrivateUserEnum).filter((x) => typeof x === "string"),
] as PrivateUserKeys[];

// Private user data that should never get sent to the client
export type PublicUser = Pick<User, PublicUserKeys>;

export type UserPublic = Pick<User, PublicUserKeys>;

export interface UserPrivate extends Pick<User, PrivateUserKeys> {
	locale: string;
}

@Entity("users")
export class User extends BaseClass {
	@Column()
	username: string; // username max length 32, min 2 (should be configurable)

	@Column()
	discriminator: string = "0000"; // opaque string: 4 digits on discord.com

	@Column({ nullable: true })
	avatar?: string; // hash of the user avatar

	@Column({ nullable: true })
	accent_color?: number; // banner color of user

	@Column({ nullable: true })
	banner?: string; // hash of the user banner

	@Column({ nullable: true, type: "simple-array" })
	theme_colors?: [number, number]; // TODO: Separate `User` and `UserProfile` models

	@Column({ nullable: true })
	pronouns?: string;

	@Column({ nullable: true, select: false })
	phone?: string; // phone number of the user

	@Column({ select: false })
	desktop: boolean = true; // if the user has desktop app installed

	@Column({ select: false })
	mobile: boolean = true; // if the user has mobile app installed

	@Column()
	premium: boolean = true; // if user bought individual premium

	@Column()
	premium_type: number = 2; // individual premium level

	@Column()
	bot: boolean = false; // if user is bot

	@Column()
	bio: string = ""; // short description of the user (max 190 chars -> should be configurable)

	@Column()
	system: boolean = false; // shouldn't be used, the api sends this field type true, if the generated message comes from a system generated author

	@Column({ select: false })
	nsfw_allowed: boolean = true; // if the user can do age-restricted actions (NSFW channels/guilds/commands) // TODO: depending on age

	@Column({ select: false })
	mfa_enabled: boolean = false; // if multi factor authentication is enabled

	@Column({ select: false, default: false })
	webauthn_enabled: boolean = false; // if webauthn multi factor authentication is enabled

	@Column({ select: false, nullable: true })
	totp_secret?: string = "";

	@Column({ nullable: true, select: false })
	totp_last_ticket?: string = "";

	@Column()
	created_at: Date = new Date(); // registration date

	@Column({ nullable: true })
	premium_since: Date; // premium date

	@Column({ select: false })
	verified: boolean = true; // email is verified

	@Column()
	disabled: boolean = false; // if the account is disabled

	@Column()
	deleted: boolean = false; // if the user was deleted

	@Column({ nullable: true, select: false })
	email?: string; // email of the user

	@Column()
	flags: string = "0"; // UserFlags // TODO: generate

	@Column()
	public_flags: number = 0;

	@Column()
	purchased_flags: number = 0;

	@Column()
	premium_usage_flags: number = -1;

	@Column({ type: "bigint" })
	rights: string = "874722686401536"; // 1760002018-like rights

	@OneToMany(() => Session, (session: Session) => session.user)
	sessions: Session[];

	@JoinColumn({ name: "relationship_ids" })
	@OneToMany(
		() => Relationship,
		(relationship: Relationship) => relationship.from,
		{
			cascade: true,
			orphanedRowAction: "delete",
		},
	)
	relationships: Relationship[];

	@JoinColumn({ name: "connected_account_ids" })
	@OneToMany(
		() => ConnectedAccount,
		(account: ConnectedAccount) => account.user,
		{
			cascade: true,
			orphanedRowAction: "delete",
		},
	)
	connected_accounts: ConnectedAccount[];

	@Column({ type: "simple-json", select: false })
	data: {
		valid_tokens_since: Date; // all tokens with a previous issue date are invalid
		hash?: string; // hash of the password, salt is saved in password (bcrypt)
	};

	@Column({ type: "simple-array", select: false })
	fingerprints: string[] = []; // array of fingerprints -> used to prevent multiple accounts

	@OneToOne(() => UserSettings, {
		cascade: true,
		orphanedRowAction: "delete",
		eager: false,
	})
	@JoinColumn()
	settings: UserSettings;

	// workaround to prevent fossord-unaware clients from deleting settings not used by them
	@Column({ type: "simple-json", select: false })
	extended_settings: string = "{}";

	@OneToMany(() => SecurityKey, (key: SecurityKey) => key.user)
	security_keys: SecurityKey[];

	toPublicUser() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const user: any = {};
		PublicUserProjection.forEach((x) => {
			user[x] = this[x];
		});
		return user as PublicUser;
	}

	static async getPublicUser(user_id: string, opts?: FindOneOptions<User>) {
		return await User.findOneOrFail({
			where: { id: user_id },
			...opts,
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			select: [...PublicUserProjection, ...(opts?.select || [])], // TODO: fix
		});
	}

	static async register({
		username,
		password,
		id,
		req,
	}: {
		username: string;
		password?: string;
		email?: string;
		date_of_birth?: Date; // "2000-04-03"
		id?: string;
		req?: Request;
	}) {
		// trim special uf8 control characters -> Backspace, Newline, ...
		username = trimSpecial(username);

		// TODO: save date_of_birth
		// appearently discord doesn't save the date of birth and just calculate if nsfw is allowed
		// if nsfw_allowed is null/undefined it'll require date_of_birth to set it to true/false
		const language =
			req?.language === "en" ? "en-US" : req?.language || "en-US";

		const settings = UserSettings.create({
			locale: language,
		});

		const user = User.create({
			username: username,
			discriminator: "0000",
			id: id || Snowflake.generate(),
			email: username,
			data: {
				hash: password,
				valid_tokens_since: new Date(),
			},
			extended_settings: "{}",
			premium_since: new Date(),
			settings: settings,
			rights: "874722686401536", // 1760002018-like rights
		});

		await Promise.all([user.save(), settings.save()]);

		setImmediate(async () => {
			if (Config.get().guild.autoJoin.enabled) {
				for (const guild of Config.get().guild.autoJoin.guilds || []) {
					await Member.addToGuild(user.id, guild).catch((e) =>
						console.error("[Autojoin]", e),
					);
				}
			}
		});

		return user;
	}
}

export const CUSTOM_USER_FLAG_OFFSET = BigInt(1) << BigInt(32);

export class UserFlags extends BitField {
	static FLAGS = {
		DISCORD_EMPLOYEE: BigInt(1) << BigInt(0),
		PARTNERED_SERVER_OWNER: BigInt(1) << BigInt(1),
		HYPESQUAD_EVENTS: BigInt(1) << BigInt(2),
		BUGHUNTER_LEVEL_1: BigInt(1) << BigInt(3),
		MFA_SMS: BigInt(1) << BigInt(4),
		PREMIUM_PROMO_DISMISSED: BigInt(1) << BigInt(5),
		HOUSE_BRAVERY: BigInt(1) << BigInt(6),
		HOUSE_BRILLIANCE: BigInt(1) << BigInt(7),
		HOUSE_BALANCE: BigInt(1) << BigInt(8),
		EARLY_SUPPORTER: BigInt(1) << BigInt(9),
		TEAM_USER: BigInt(1) << BigInt(10),
		TRUST_AND_SAFETY: BigInt(1) << BigInt(11),
		SYSTEM: BigInt(1) << BigInt(12),
		HAS_UNREAD_URGENT_MESSAGES: BigInt(1) << BigInt(13),
		BUGHUNTER_LEVEL_2: BigInt(1) << BigInt(14),
		UNDERAGE_DELETED: BigInt(1) << BigInt(15),
		VERIFIED_BOT: BigInt(1) << BigInt(16),
		EARLY_VERIFIED_BOT_DEVELOPER: BigInt(1) << BigInt(17),
		CERTIFIED_MODERATOR: BigInt(1) << BigInt(18),
		BOT_HTTP_INTERACTIONS: BigInt(1) << BigInt(19),
	};
}
