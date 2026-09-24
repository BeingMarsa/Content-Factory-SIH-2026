// ---------------------------------------------------------------------------
// Mongoose Model: TransformationHistory
// Logs every transformation request and its AI-generated result.
// ---------------------------------------------------------------------------

import mongoose, { Schema, Document, Model } from "mongoose";

/** TypeScript interface for a TransformationHistory document. */
export interface ITransformationHistory extends Document {
  operatorId?: string;
  sourceContent: string;
  configurations: {
    targetAudience: string;
    toneStyle: string;
    language: string;
    levelOfDetail: string;
    communicationObjective: string;
  };
  requestedOutputs: string[];
  generatedResult: string;
  createdAt: Date;
}

const TransformationHistorySchema = new Schema<ITransformationHistory>(
  {
    operatorId: {
      type: String,
      required: false,
      default: null,
    },
    sourceContent: {
      type: String,
      required: [true, "Source content is required"],
    },
    configurations: {
      targetAudience: { type: String, required: true },
      toneStyle: { type: String, required: true },
      language: { type: String, required: true },
      levelOfDetail: { type: String, required: true },
      communicationObjective: { type: String, required: true },
    },
    requestedOutputs: {
      type: [String],
      required: [true, "At least one output type must be selected"],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one output type must be selected",
      },
    },
    generatedResult: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/** Prevent model re-compilation during Next.js hot-reloads. */
const TransformationHistory: Model<ITransformationHistory> =
  mongoose.models.TransformationHistory ??
  mongoose.model<ITransformationHistory>(
    "TransformationHistory",
    TransformationHistorySchema
  );

export default TransformationHistory;
