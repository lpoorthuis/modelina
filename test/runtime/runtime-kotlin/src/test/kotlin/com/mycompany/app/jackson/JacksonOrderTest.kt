package com.mycompany.app.jackson

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class JacksonOrderTest {
    private val objectMapper = jacksonObjectMapper()

    @Test
    fun shouldSerializeAndDeserializeModelUsingSchemaNamesAndEnumValues() {
        val order = JacksonOrder(
            orderId = "4711",
            status = OrderStatus.IN_MINUS_PROGRESS
        )

        val json = objectMapper.writeValueAsString(order)

        assertTrue(json.contains("\"order_id\":\"4711\""))
        assertTrue(json.contains("\"status\":\"in-progress\""))
        assertEquals(order, objectMapper.readValue<JacksonOrder>(json))
    }
}
