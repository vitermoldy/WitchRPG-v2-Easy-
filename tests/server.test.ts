import { describe, expect, it } from 'vitest'
// @ts-expect-error the server is plain JavaScript without type declarations
import { cleanProfile } from '../server/app.js'
