import { Database } from "../src/database";
import { minutes } from "./utils";

describe("Queries Across Tables", () => {
    let db: Database;

    beforeAll(async () => {
        db = await Database.fromExisting("03", "04");
    }, minutes(1));

    it("should select count of apps which have free pricing plan", async done => {
        const query = `SELECT COUNT(DISTINCT apps.id) as count 
                       FROM apps 
                       JOIN apps_pricing_plans ON apps.id = apps_pricing_plans.app_id 
                       JOIN pricing_plans ON apps_pricing_plans.pricing_plan_id = pricing_plans.id 
                       WHERE pricing_plans.price = 'Free' OR pricing_plans.price = 'Free to install';`;
        const result = await db.selectSingleRow(query);
        expect(result).toEqual({
            count: 1112
        });
        done();
    }, minutes(1));

    it("should select top 3 most common categories", async done => {
        const query = `SELECT COUNT(*) as count, categories.title as category 
                       FROM apps_categories 
                       JOIN categories ON apps_categories.category_id = categories.id 
                       GROUP BY categories.title 
                       ORDER BY count DESC 
                       LIMIT 3;`;
        const result = await db.selectMultipleRows(query);
        expect(result).toEqual([
            { count: 1193, category: "Store design" },
            { count: 723, category: "Sales and conversion optimization" },
            { count: 629, category: "Marketing" }
        ]);
        done();
    }, minutes(1));

    it("should select top 3 prices by appearance in apps and in price range from $5 to $10 inclusive (not matters monthly or one time payment)", async done => {
        const query = `SELECT COUNT(*) as count, 
                              '$' || CASE
                                  WHEN price_num = CAST(price_num as INTEGER)
                                  THEN CAST(price_num as INTEGER)
                                  ELSE price_num
                               END || '/month' as price, 
                               price_num as casted_price 
                       FROM (
                           SELECT apps_pricing_plans.app_id, 
                                  CAST(REPLACE(REPLACE(pricing_plans.price, '$', ''), '/month', '') as REAL) as price_num
                           FROM apps_pricing_plans 
                           JOIN pricing_plans ON apps_pricing_plans.pricing_plan_id = pricing_plans.id
                       ) as subquery
                       WHERE price_num BETWEEN 5 AND 10 
                       GROUP BY price_num 
                       ORDER BY count DESC 
                       LIMIT 3;`;
        const result = await db.selectMultipleRows(query);
        expect(result).toEqual([
            { count: 225, price: "$9.99/month", casted_price: 9.99 },
            { count: 135, price: "$5/month", casted_price: 5 },
            { count: 114, price: "$10/month", casted_price: 10 }
        ]);
        done();
    }, minutes(1));
});