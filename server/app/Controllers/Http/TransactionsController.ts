import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { schema } from "@ioc:Adonis/Core/Validator";
import AppError from "App/Exceptions/AppError";
import Balance from "App/Models/Balance";

export default class TransactionsController {
  public async index({ auth, request }: HttpContextContract) {
    const { reference_month, limit_transactions } = request.get();

    const user = auth.user;

    if (!user) {
      throw new AppError("User not found");
    }

    var balance = await Balance.query()
      .where("reference_month", reference_month)
      .where("user_id", user.id)
      .preload("transactions", transactions => {
        transactions
          .orderBy("created_at", "desc")
          .groupLimit(limit_transactions);
      })
      .first();

    if (!balance) {
      throw new AppError("Balancete não encontrado");
    }

    return {
      ...balance.toJSON(),
      ...balance.transaction_get_values,
    };
  }

  public async store({ request }: HttpContextContract) {
    const schemaValidation = schema.create({
      name: schema.string(),
      value: schema.number(),
      day_register_at: schema.number(),
    });

    const { name, day_register_at, value } = await request.validate({
      schema: schemaValidation,
    });

    const id = request.param("balance_id");

    const balance = await Balance.findOrFail(id);

    await balance.preload("transactions");

    const transaction = await balance.related("transactions").create({
      name,
      day_register_at,
      value,
    });

    // if (value > 0) {
    //   balance.gross_revenue += value;
    // } else {
    //   balance.total_spend += value;
    // }

    // await balance.save();

    return transaction;
  }

  public async show({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({ request }: HttpContextContract) {
    const { balance_id, transaction_id } = request.params();

    const balance = await Balance.find(balance_id);

    if (!balance) {
      throw new AppError("Balance não encontrado");
    }

    const transaction = await balance
      .related("transactions")
      .query()
      .where("id", transaction_id)
      .first();

    if (!transaction) {
      throw new AppError("Transação não encontrada");
    }

    try {
      await transaction.delete();
    } catch (error) {
      throw new AppError("Erro ao deletar transação. Favor, tente novamente!");
    }

    return { message: "Transação deletada com sucesso" };
  }
}
