import { getRequiredPool } from '../db/connection.js';
import { academicPreferencesSchema } from '../../shared/academic-context.js';
export const academicPreferencesService = {
  async get(studentId: string) {
    const result = await getRequiredPool().query('SELECT preferences FROM academic_generation_preferences WHERE student_id=$1', [studentId]);
    return result.rows.length ? academicPreferencesSchema.parse(result.rows[0].preferences) : null;
  },
  async save(studentId: string, value: unknown) {
    const preferences = academicPreferencesSchema.parse(value);
    await getRequiredPool().query(`INSERT INTO academic_generation_preferences(student_id,preferences) VALUES($1,$2::jsonb)
      ON CONFLICT(student_id) DO UPDATE SET preferences=EXCLUDED.preferences,updated_at=NOW()`,[studentId,JSON.stringify(preferences)]);
    return preferences;
  },
  async clear(studentId: string) {
    await getRequiredPool().query('DELETE FROM academic_generation_preferences WHERE student_id=$1',[studentId]);
  },
};
