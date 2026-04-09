import type { IdGenerator } from "../../domain/ports/services/id-generator.ts";
import { uuidv7 } from "../crypto/uuidv7.ts";

export class SystemIdGenerator implements IdGenerator {
  uuidv7(): string {
    return uuidv7();
  }
}
